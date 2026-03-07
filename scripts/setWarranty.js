const hre = require("hardhat");

// ─────────────────────────────────────────────
// ChainTag - Set Brand Warranty Duration
// Run: npx hardhat run scripts/setWarranty.js --network baseSepolia
// ─────────────────────────────────────────────

const VERIFICATION_LOG_ADDRESS = "0x3eD2c8E280c2D67cCE8943441AA7cA9a2024B5dD";
const WARRANTY_DAYS = 365; // ← change this if needed

async function main() {
  // index 1 = brand wallet (Account 1)
  const [, brand] = await hre.ethers.getSigners();

  console.log("\n🛡️  ChainTag - Set Warranty Duration");
  console.log("─────────────────────────────────────────────────");
  console.log("👛 Brand wallet:", brand.address);
  console.log("📅 Setting warranty to", WARRANTY_DAYS, "days...");

  const verificationLog = await hre.ethers.getContractAt(
    "VerificationLog",
    VERIFICATION_LOG_ADDRESS,
    brand   // ← brand signs this transaction
  );

  const tx = await verificationLog.setBrandWarrantyDuration(WARRANTY_DAYS);
  await tx.wait();

  console.log("✅ Warranty duration set to", WARRANTY_DAYS, "days!");
  console.log("─────────────────────────────────────────────────\n");
}

main().catch(console.error);