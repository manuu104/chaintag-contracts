require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: {
    version: "0.8.28",
    settings: {
      evmVersion: "cancun"
    }
  },
  networks: {
    baseSepolia: {
      url: "https://sepolia.base.org",
      accounts: [
        process.env.PRIVATE_KEY_ADMIN,   // index 0 — ChainTag Dev (contract owner)
        process.env.PRIVATE_KEY_BRAND,   // index 1 — Account 1 (verified brand)
      ],
      chainId: 84532
    }
  }
};