const hre = require("hardhat");

const VERIFICATION_LOG_ADDRESS = "0x3eD2c8E280c2D67cCE8943441AA7cA9a2024B5dD";
const WARRANTY_DAYS = 365;

async function main() {
  const [, brand] = await hre.ethers.getSigners();

  console.log("\n🛡️  ChainTag - Set Warranty Duration");
  console.log("─────────────────────────────────────────────────");
  console.log("👛 Brand wallet:", brand.address);
  console.log("📅 Setting warranty to", WARRANTY_DAYS, "days...");

  const verificationLog = await hre.ethers.getContractAt(
    "VerificationLog",
    VERIFICATION_LOG_ADDRESS,
    brand  
  );

  const tx = await verificationLog.setBrandWarrantyDuration(WARRANTY_DAYS);
  await tx.wait();

  console.log("✅ Warranty duration set to", WARRANTY_DAYS, "days!");
  console.log("─────────────────────────────────────────────────\n");
}

main().catch(console.error);