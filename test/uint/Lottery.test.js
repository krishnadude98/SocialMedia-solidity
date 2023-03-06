const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { assert, expect } = require("chai");
const { experimentalAddHardhatNetworkMessageTraceHook } = require("hardhat/config");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", function () {
          let lottery, vrfCoodinatorV2Mock, lotteryEntranceFee, deployer, interval;
          const chainId = network.config.chainId;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              lottery = await ethers.getContract("Lottery", deployer);
              vrfCoodinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
              lotteryEntranceFee = await lottery.getEntranceFee();
              interval = await lottery.getInterval();
          });

          describe("constructor", function () {
              it("Initalizes LOttery correctly", async function () {
                  const lotteryState = await lottery.getLotteryState();
                  assert.equal(lotteryState.toString(), "0");
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
              });
          });

          describe("enterLOttery", function () {
              it("reverts when user dont pay enough", async function () {
                  await expect(lottery.enterLottery()).to.be.revertedWith(
                      "Lottery__NotEnoughEthEntered"
                  );
              });
              it("records players when they enter", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFee });
                  const playerRegistered = await lottery.getPlayer(0);
                  assert.equal(playerRegistered, deployer);
              });
              it("emits event on enter", async function () {
                  await expect(lottery.enterLottery({ value: lotteryEntranceFee })).to.emit(
                      lottery,
                      "LotteryEnter"
                  );
              });

              it("Dosen't allow to enter lottery when calculating", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);

                  await lottery.performUpkeep([]);
                  await expect(
                      lottery.enterLottery({ value: lotteryEntranceFee })
                  ).to.be.revertedWith("Lottery__NotOpen");
              });
          });

          describe("checkUpkeep", function () {
              it("it retuns false if people haven't send any funds", async function () {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });

              it("it retuns false if if lottery is not open", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  await lottery.performUpkeep([]);
                  const lotteryState = await lottery.getLotteryState();
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                  assert.equal(lotteryState.toString(), "1");
                  assert.equal(upkeepNeeded, false);
              });

              it("return false if enough time has't passed", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 2]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                  assert(!upkeepNeeded);
              });
              it("return true if enough time t passed", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
                  assert(upkeepNeeded);
              });
          });
          describe("performUpkeep", function () {
              it("can only run if checkup keep is true", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const tx = await lottery.performUpkeep([]);
                  assert(tx);
              });
              it("reverts when checkup is falls", async function () {
                  await expect(lottery.performUpkeep([])).to.be.revertedWith(
                      "Lottery__UpkeepNotNeeded"
                  );
              });
              it("updates the lottery state,enits an event, and calls vrf coodinator", async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
                  const tx = await lottery.performUpkeep([]);
                  const txReciept = await tx.wait(1);
                  const lotteryState = await lottery.getLotteryState();
                  const requestId = txReciept.events[1].args.requestId;
                  assert(requestId.toNumber() > 0);
                  assert(lotteryState.toString() === "1");
              });
          });

          describe("fullfillRandomWords", function () {
              beforeEach(async function () {
                  await lottery.enterLottery({ value: lotteryEntranceFee });
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                  await network.provider.send("evm_mine", []);
              });
              it("can only be called after perform upkeep", async function () {
                  await expect(
                      vrfCoodinatorV2Mock.fulfillRandomWords(0, lottery.address)
                  ).to.be.revertedWith("nonexistent request");
                  await expect(
                      vrfCoodinatorV2Mock.fulfillRandomWords(1, lottery.address)
                  ).to.be.revertedWith("nonexistent request");
              });

              it("picks winner,resets lottery, and sends money", async function () {
                  const aditionalENtrants = 3;
                  const startingAccountsindex = 1;
                  const accounts = await ethers.getSigners();
                  for (
                      let i = startingAccountsindex;
                      i < startingAccountsindex + aditionalENtrants;
                      i++
                  ) {
                      const accountConnectedLottery = lottery.connect(accounts[i]);
                      await accountConnectedLottery.enterLottery({ value: lotteryEntranceFee });
                  }

                  const startingTimeStamp = await lottery.getLatestTimeStamp();

                  await new Promise(async (resolve, reject) => {
                      lottery.once("WinnerPicked", async () => {
                          // event listener for WinnerPicked
                          console.log("WinnerPicked event fired!");
                          // assert throws an error if it fails, so we need to wrap
                          // it in a try/catch so that the promise returns event
                          // if it fails.
                          try {
                              const recentWinner = await lottery.getRecentWinner();
                              const winnerEndingBalance= await accounts[1].getBalance()
                              const lotteryState = await lottery.getLotteryState();
                              const endingTimeStamp = await lottery.getLatestTimeStamp();
                              const numPlayers = await lottery.getNumberOfPlayers();
                              assert.equal(numPlayers.toString(), "0");
                              assert.equal(lotteryState.toString(), "0");
                              assert(endingTimeStamp > startingTimeStamp);

                              assert.equal(winnerEndingBalance.toString(), winnerStartingBalnce.add(lotteryEntranceFee.mul(aditionalENtrants).add(lotteryEntranceFee).toString()))
                              resolve();
                          } catch (e) {
                              reject(e);
                          }
                      });

                      // kicking off the event by mocking the chainlink keepers and vrf coordinator
                      const tx = await lottery.performUpkeep([]);
                      const txReciept = await tx.wait(1);
                      const winnerStartingBalnce= await accounts[1].getBalance()
                      await vrfCoodinatorV2Mock.fulfillRandomWords(
                          txReciept.events[1].args.requestId,
                          lottery.address
                      );
                  });
              });
          });
      });
