const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying ChainTag contracts to Base Sepolia...");
  console.log("─────────────────────────────────────────────────");

  // Deploy ProductRegistry first
  const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
  const registry = await ProductRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ ProductRegistry deployed to:", registryAddress);

  // Deploy VerificationLog with ProductRegistry address
  const VerificationLog = await hre.ethers.getContractFactory("VerificationLog");
  const verificationLog = await VerificationLog.deploy(registryAddress);
  await verificationLog.waitForDeployment();
  const verificationLogAddress = await verificationLog.getAddress();
  console.log("✅ VerificationLog deployed to:", verificationLogAddress);

  console.log("─────────────────────────────────────────────────");
  console.log("🎉 Deployment complete!");
  console.log("📋 Save these addresses:");
  console.log("   ProductRegistry:", registryAddress);
  console.log("   VerificationLog:", verificationLogAddress);
  console.log("─────────────────────────────────────────────────");
  console.log("🔍 View on Basescan:");
  console.log(`   https://sepolia.basescan.org/address/${registryAddress}`);
  console.log(`   https://sepolia.basescan.org/address/${verificationLogAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});