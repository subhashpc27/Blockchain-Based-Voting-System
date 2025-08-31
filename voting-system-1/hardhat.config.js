require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ethers");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    development: {
      url: "http://127.0.0.1:7545", 
      accounts: [

        //private keys
        "0x9961aa231e917512e41f17eb6e89bd4137cabaf945f45503926958c049a728ed",
        "0x2e103b0b24826dd5d6bdc33bd35a6fe03b3835299ecd1eac642581f7d65cec0e",
        "0x48c8999a27863a06a9b4d083d365c99acf70baeb65c0bb70129e57234cb4fc5a"
      ],
      chainId: 1337,
      gas: 6721975,
      gasPrice: 20000000000
    },
    ganache: {
      url: "http://127.0.0.1:7545",
      chainId: 1337
    }
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  }
};