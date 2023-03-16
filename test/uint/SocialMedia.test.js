const { developmentChains, networkConfig } = require("../../helper-hardhat-config");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("SocialMedia", function () {
          let socialMedia, deployer, tester;
          const chainId = network.config.chainId;

          beforeEach(async function () {
              [, tester] = await ethers.getSigners();
              deployer = (await getNamedAccounts()).deployer;
              await deployments.fixture(["all"]);
              socialMedia = await ethers.getContract("SocialMedia", deployer);
          });
          describe("createPost", function () {
              it("creates a post", async function () {
                  await socialMedia.createPost("hi from post", "ojafjaojfaf4a2d1a");
                  let post = await socialMedia.getPost("1");
                  assert.equal(post.User, deployer);
                  assert.equal(post.postUid.toString(), "1");
                  assert.equal(post.text, "hi from post");
                  assert.equal(post.ipfsHash, "ojafjaojfaf4a2d1a");
              });

              it("emits create post event", async function () {
                  await socialMedia.createPost("hi from post", "ojafjaojfaf4a2d1a");
                  await expect(socialMedia.createPost("hi from post", "ojafjaojfaf4a2d1a")).to.emit(
                      socialMedia,
                      "NewPost"
                  );
                  const tx = await socialMedia.createPost("hi from post2", "ojafjaojfaf4a2d1a2");

                  const txReciept = await tx.wait(1);
                  assert.equal(txReciept.events.length, 1);
                  assert.equal(txReciept.events[0].args.users, deployer);
                  assert.equal(txReciept.events[0].args.ipfsHash, "ojafjaojfaf4a2d1a2");
                  assert.equal(txReciept.events[0].args.text, "hi from post2");
              });
          });

          describe("deletes a post", async function () {
              it("throws error if postuid not exist", async function () {
                  await expect(socialMedia.deletePost("1")).to.be.revertedWith(
                      "deletePost__InvalidPostUid"
                  );
              });
              it("throws error if user tries to delete a post that's not his", async function () {
                  await socialMedia.createPost("hi from post", "ojafjaojfaf4a2d1a");
                  await expect(socialMedia.connect(tester).deletePost("1")).to.be.revertedWith(
                      "deletePost__SenderNotPoster"
                  );
              });
              it("delete post", async function () {
                  await socialMedia.createPost("hi from post", "ojafjaojfaf4a2d1a");
                  await socialMedia.deletePost("1");
                  expect(socialMedia.getPost("1")).to.be.reverted;
              });
              it("emits a delete event", async function () {
                  await socialMedia.createPost("hi from post", "ojafjaojfaf4a2d1a");
                  await expect(socialMedia.deletePost("1")).to.emit(socialMedia, "DeletePost");
                  await socialMedia.createPost("hi from post2", "ojafjaojfaf4a2d1a2");
                  let tx = await socialMedia.deletePost("2");
                  const txReciept = await tx.wait(1);
                  let numofPosts = await socialMedia.getTotalPost();
                  assert.equal(numofPosts.toString(), "2");
                  assert.equal(txReciept.events.length, 1);
                  assert.equal(txReciept.events[0].args.users, deployer);
                  assert.equal(txReciept.events[0].args.postId, "2");
              });
          });
      });
