require("@nomicfoundation/hardhat-chai-matchers");
require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-network-helpers");
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },

  networks: {
    hardhat: {
      chainId: 1337,
    },

    localhost: {
      url: "http://127.0.0.1:8545",
    },

    // Arc Testnet (update these values when you have them)
    arcTestnet: {
      url: process.env.ARC_TESTNET_RPC_URL || "http://localhost:8545",
      accounts: process.env.PRIVATE_KEY
        ? [`0x${process.env.PRIVATE_KEY.replace(/^0x/, "")}`]
        : [],
      chainId: parseInt(process.env.ARC_CHAIN_ID || "5042002"),
      gasPrice: "auto",
      timeout: 60000,
    },
  },

  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 40000,
  },
};
