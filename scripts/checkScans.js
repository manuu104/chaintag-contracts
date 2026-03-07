const hre = require("hardhat");

const VERIFICATION_LOG_ADDRESS = "0x3eD2c8E280c2D67cCE8943441AA7cA9a2024B5dD";
const PRODUCT_REGISTRY_ADDRESS = "0x6D123b6718fe2018c6D643cd641Db9DB1Bf339bB";

async function main() {
  const verificationLog = await hre.ethers.getContractAt(
    "VerificationLog",
    VERIFICATION_LOG_ADDRESS
  );

  const registry = await hre.ethers.getContractAt(
    "ProductRegistry",
    PRODUCT_REGISTRY_ADDRESS
  );

  // ── Check token IDs 1 to 10 ──
  console.log("\n📊 ChainTag - Scan Report");
  console.log("─────────────────────────────────────────────────");

  for (let tokenId = 1; tokenId <= 10; tokenId++) {
    const isAuthentic = await registry.isAuthentic(tokenId);
    if (!isAuthentic && tokenId > 1) break; // stop if product doesn't exist

    try {
      const summary = await verificationLog.getProductSummary(tokenId);
      const product = await registry.getProduct(tokenId);
      const history = await verificationLog.getScanHistory(tokenId);

      console.log(`\n🏷️  Token #${tokenId} — ${product.productName}`);
      console.log(`   Serial:       ${product.serialNumber}`);
      console.log(`   Authentic:    ${summary.authentic ? "✅ Yes" : "❌ No"}`);
      console.log(`   Total Scans:  ${summary.totalScans.toString()}`);
      console.log(`   Warranty:     ${summary.warrantyActive ? "✅ Active" : "❌ Inactive"}`);
      console.log(`   Points:       ${summary.points.toString()}`);

      if (history.length > 0) {
        console.log(`   Scan History:`);
        history.forEach((scan, i) => {
          const date = new Date(Number(scan.scannedAt) * 1000).toLocaleString();
          console.log(`     ${i + 1}. ${scan.scanner}`);
          console.log(`        📍 ${scan.location || "No location"}`);
          console.log(`        🕐 ${date}`);
          console.log(`        ✅ Authentic: ${scan.isAuthentic}`);
        });
      }
      console.log("─────────────────────────────────────────────────");

    } catch { break; }
  }
}

main().catch(console.error);