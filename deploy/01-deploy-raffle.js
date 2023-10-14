const { network, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../helper-hardhat-config");
const { verify } = require("../utils/Verify");

const VRF_SUB_FUND_AMOUNT = 2000000000000000000n;

module.exports = async function ({ getNamedAccounts, deployments }) {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const chainId = network.config.chainId;
  console.log(chainId);
  let VRFCoordinatorV2Address, subscriptionId, VRFCoordinatorV2Mock;

  // If its development chain we should deploy our mocks
  if (developmentChains.includes(network.name)) {
    VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    VRFCoordinatorV2Address = await VRFCoordinatorV2Mock.getAddress();

    // to create subscriptionID for localhost
    const transactionResponse = await VRFCoordinatorV2Mock.createSubscription();
    const transactionReciept = await transactionResponse.wait(1);
    subscriptionId = 1;

    // Fund the Subscription
    // Usually, you'd need the link token on a real or test network to fund subscription
    await VRFCoordinatorV2Mock.fundSubscription(
      subscriptionId,
      VRF_SUB_FUND_AMOUNT
    );
  } else {
    // for testnet we are getting subscription id from- https://vrf.chain.link/
    VRFCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"];
    subscriptionId = networkConfig[chainId]["subscriptionId"];
  }

  const entranceFee = networkConfig[chainId]["entranceFee"];
  const gasLane = networkConfig[chainId]["gasLane"];
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"];
  const interval = networkConfig[chainId]["interval"];

  const args = [
    entranceFee,
    VRFCoordinatorV2Address,
    gasLane,
    subscriptionId,
    callbackGasLimit,
    interval,
  ];

  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  });

  if (developmentChains.includes(network.name)) {
    await VRFCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
  }

  if (!developmentChains.includes(network.name)) {
    log("Verifying....");
    await verify(raffle.address, args);
  }
};

module.exports.tags = ["all", "raffle"];
