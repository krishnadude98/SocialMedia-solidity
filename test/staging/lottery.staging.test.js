const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { assert, expect } = require("chai");
const { experimentalAddHardhatNetworkMessageTraceHook } = require("hardhat/config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Lottery", function () {
          let lottery, lotteryEntranceFee, deployer;
          const chainId = network.config.chainId;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              lottery = await ethers.getContract("Lottery", deployer);
              lotteryEntranceFee = await lottery.getEntranceFee();
          });

          describe("fullfillRandomWords", async function () {
              it("Works with live chainlink keepers and chainlink VRF,we get random winner", async function () {
                  const startingTimestamp = await lottery.getLatestTimeStamp();
                  const accounts = await ethers.getSigners();
                  await new Promise(async function (resolve, reject) {
                      lottery.once("WinnerPicked", async function () {
                          console.log("winner picked event happened");
                          try {
                            
                              const recentWinner = await lottery.getRecentWinner();
                            
                              const lotterySTate = await lottery.getLotteryState();
                             
                              const winnerEndingBalnce = await accounts[0].getBalance();
                    
                              const endingTimestamp = await lottery.getLatestTimeStamp();
                          

                              await expect(lottery.getPlayer(0)).to.be.reverted;
                        
                              assert.equal(recentWinner.toString(), accounts[0].address);
                              assert.equal(lotterySTate, 0);
                              assert.equal(
                                  winnerEndingBalnce.toString(),
                                  winnerStartingBalance.add(lotteryEntranceFee).toString()
                              );
                              assert(endingTimestamp > startingTimestamp);
                              resolve();
                          } catch (error) {
                              console.log(error);
                              reject(e);
                          }
                      });
                      const tx = await lottery.enterLottery({ value: lotteryEntranceFee });
                      await tx.wait(1);
                      const winnerStartingBalance = await accounts[0].getBalance();
                  });
              });
          });
      });
