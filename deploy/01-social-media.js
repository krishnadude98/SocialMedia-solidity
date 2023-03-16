const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    const args = [];
    const socialMedia = await deploy("SocialMedia", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (
        (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) ||
        process.env.POLYGON_API_KEY
    ) {
        console.log("VERIFYING.........");
        await verify(socialMedia.address, args);
    }

    console.log("------------------------------------");
};
module.exports.tags = ["all", "socialmedia"];
