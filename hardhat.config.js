/** @type import('hardhat/config').HardhatUserConfig */
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

module.exports = {
  solidity: "0.8.18",
  namedAccounts: {
    deployer: {
      default: 0, // here this will by default take the first account as deployer
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    goerli: {
      url: "https://eth-goerli.g.alchemy.com/v2/lFlEqs4A-_jmelDXJeTXPhDK15PBnFL9",
      accounts: [
        "0x36e81a7c346508f7f67acff5338dec1c50b7d3953e0832e61f5f9b2b354d412c",
      ],
      blockConfirmations: 6,
      chainId: 5,
    },
    sepolia: {
      url: "https://eth-sepolia.g.alchemy.com/v2/pKAp_gSvL7S-wKRwvBpO3On2Xv7t8_U6",
      accounts: [
        "0x852adce2bd49231842b78308610824c3cd74d0bf2c7fdd294235db342e072ac3",
      ],
      blockConfirmations: 6,
      chainId: 11155111,
    },
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    },
    // localhost: {
    //   url: "http://127.0.0.1:8545/",
    //   // accounts hardhat will place by default when running hardhat on localhost
    // },
  },
  etherscan: {
    apiKey: "Y1KDYSC31H5GJGDGRMUTEP1BT4FF1NDHGX",
  },
  mocha: {
    timeout: 400000,
  },
};
