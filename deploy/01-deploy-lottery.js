const { network, ethers } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const VRF_SCRIPTION_AMOUNT = ethers.utils.parseEther("2");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address, subsriptionId, vrfCoordinatorV2Mock;

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReciept = await transactionResponse.wait(1);
        subsriptionId = transactionReciept.events[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(subsriptionId, VRF_SCRIPTION_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
        subsriptionId = networkConfig[chainId]["subsriptionId"];
    }
    const entranceFee = networkConfig[chainId]["entranceFee"];
    const gasLane = networkConfig[chainId]["gasLane"];
    const callbackGasLimit = networkConfig[chainId]["callBackGasLimit"];
    const interval = networkConfig[chainId]["interval"];
    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gasLane,
        subsriptionId,
        callbackGasLimit,
        interval,
    ];
    const lottery = await deploy("Lottery", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (developmentChains.includes(network.name)) {
        await vrfCoordinatorV2Mock.addConsumer(subsriptionId, lottery.address);
    }

    if (
        !developmentChains.includes(network.name) &&
        process.env.ETHERSCAN_API_KEY &&
        process.env.POLYGON_API_KEY
    ) {
        console.log("VERIFYING.........");
        await verify(lottery.address, args);
    }

    console.log("------------------------------------");
};
module.exports.tags = ["all", "lottery"];
