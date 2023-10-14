const { network, ethers } = require("hardhat");
const { developmentChains } = require("../helper-hardhat-config");

// 0.25 is the premium, we should pay 0.25LINK to chainlink to request random number
const BASE_FEE = 250000000000000000n;
// chainlink nodes pay gas fees to ethereum to get randomness, so the gas price per LINK changes based on gas fees to keep profits
const GAS_PRICE_LINK = 1e9;

module.exports = async ({ getNamedAccounts, deployments, getChainId }) => {
  const { deploy, log } = deployments;
  const { deployer } = await getNamedAccounts();
  const args = [BASE_FEE, GAS_PRICE_LINK]; //args for mock Contract

  if (developmentChains.includes(network.name)) {
    log("Local network detected! Deploying Mocks....");
    // deploying a mock(VRFCoordinator)
    await deploy("VRFCoordinatorV2Mock", {
      from: deployer,
      log: true,
      args: args,
    });
    log("Mocks Deployed!!!");
    log("---------------------------");
  }
};

module.exports.tags = ["all", "mocks"];
