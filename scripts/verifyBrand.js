const hre = require("hardhat");

// ─────────────────────────────────────────────
// ChainTag - Verify a Brand
// Run: npx hardhat run scripts/verifyBrand.js --network baseSepolia
// ─────────────────────────────────────────────

const PRODUCT_REGISTRY_ADDRESS = "0x6D123b6718fe2018c6D643cd641Db9DB1Bf339bB";

// ⚙️ PASTE THE WALLET ADDRESS TO VERIFY HERE
const BRAND_TO_VERIFY = "0xB76F967931be7c9031dD90331B46683E6fDBF5F2";

async function main() {
  // index 0 = PRIVATE_KEY_ADMIN = ChainTag Dev (contract owner)
  // index 1 = PRIVATE_KEY_BRAND = Account 1 (brand wallet)
  const [admin] = await hre.ethers.getSigners();

  console.log("\n🔐 ChainTag - Verify Brand");
  console.log("─────────────────────────────────────────────────");
  console.log("👛 Admin wallet:", admin.address);
  console.log("🏷️  Verifying:", BRAND_TO_VERIFY);

  const registry = await hre.ethers.getContractAt(
    "ProductRegistry",
    PRODUCT_REGISTRY_ADDRESS,
    admin   // ← explicitly use admin signer
  );

  // Check brand is registered first
  const brandInfo = await registry.getBrand(BRAND_TO_VERIFY);
  if (brandInfo.wallet === "0x0000000000000000000000000000000000000000") {
    console.log("❌ Brand not registered yet! They need to call registerBrand() first.");
    return;
  }

  if (brandInfo.isVerified) {
    console.log("✅ Brand is already verified!");
    console.log("   Name:", brandInfo.name);
    return;
  }

  const tx = await registry.verifyBrand(BRAND_TO_VERIFY);
  await tx.wait();

  const updated = await registry.getBrand(BRAND_TO_VERIFY);
  console.log("✅ Brand verified successfully!");
  console.log("   Name:", updated.name);
  console.log("   isVerified:", updated.isVerified);
  console.log("─────────────────────────────────────────────────\n");
}

main().catch(console.error);