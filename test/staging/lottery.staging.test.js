const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { assert, expect } = require("chai");
const { experimentalAddHardhatNetworkMessageTraceHook } = require("hardhat/config");

developmentChains.includes(network.name)
    ? describe.skip
    : describe("SocialMedia", function () {
          let socialMedia, deployer;
          const chainId = network.config.chainId;

          beforeEach(async function () {
              deployer = (await getNamedAccounts()).deployer;
              socialMedia = await ethers.getContract("SocialMedia", deployer);
          });

          describe("SocialMedia", async function () {
              it("it create and delete posts", async function () {
                  await new Promise(async function (resolve, reject) {
                      socialMedia.once("NewPost", async function () {
                          console.log("new post event happened");
                          try {
                              let countAfterPosting = await socialMedia.getTotalPost();
                              console.log(countAfterPosting.toNumber());
                              assert(countAfterPosting.toNumber() > initialCount.toNumber());

                              await socialMedia.deletePost(countAfterPosting);

                              let posts = await socialMedia.getIpfsHash(countAfterPosting + 1);
                              assert.equal(posts.toString(), "");
                          } catch (error) {
                              console.log(error);
                              reject(e);
                          }
                          resolve();
                      });
                      const initialCount = await socialMedia.getTotalPost();
                      console.log(initialCount.toNumber());
                      const tx = await socialMedia.createPost(
                          "hi this is sample post",
                          "QmNYCuayPJkbHWbxSytgq8qJm7kUgA4RLfCwzSF3CGbGwn"
                      );
                      await tx.wait(1);
                  });
              });
          });
      });
