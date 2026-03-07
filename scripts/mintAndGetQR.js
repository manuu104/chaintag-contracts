const hre = require("hardhat");

// ─────────────────────────────────────────────
// ChainTag - Mint Product & Generate QR URL
// Run: npx hardhat run scripts/mintAndGetQR.js --network baseSepolia
// ─────────────────────────────────────────────

// ⚙️ CONFIGURE YOUR PRODUCT HERE
const PRODUCT = {
  productName: "Air Jordan 1",
  serialNumber: "SN-DEMO-002",  // ← new serial!
  category: "Footwear",
  tokenType: 0,
  tokenURI: "https://ipfs.io/ipfs/QmPlaceholder",
};

// ⚙️ YOUR DEPLOYED CONTRACT ADDRESSES
const PRODUCT_REGISTRY_ADDRESS = "0x6D123b6718fe2018c6D643cd641Db9DB1Bf339bB";
const VERIFICATION_LOG_ADDRESS = "0x3eD2c8E280c2D67cCE8943441AA7cA9a2024B5dD";

// ⚙️ YOUR FRONTEND URL (update when deployed)
const FRONTEND_URL = "http://localhost:3000";

async function main() {
  console.log("\n🏷️  ChainTag - Mint Product & Generate QR");
  console.log("─────────────────────────────────────────────────");

  // Get signer
  const [signer] = await hre.ethers.getSigners();
  console.log("👛 Using wallet:", signer.address);

  // If no recipient specified, use own wallet
  if (!PRODUCT.to) PRODUCT.to = signer.address;

  // Connect to deployed ProductRegistry
  const ProductRegistry = await hre.ethers.getContractFactory("ProductRegistry");
  const registry = await hre.ethers.getContractAt(
    "ProductRegistry",
    PRODUCT_REGISTRY_ADDRESS
  );

  // ── STEP 1: Check brand is registered and verified ──
  console.log("\n📋 Step 1: Checking brand status...");
  const brandInfo = await registry.getBrand(signer.address);

  if (brandInfo.wallet === "0x0000000000000000000000000000000000000000") {
    console.log("⚠️  Brand not registered! Registering now...");
    const registerTx = await registry.registerBrand("My Brand");
    await registerTx.wait();
    console.log("✅ Brand registered! Ask admin to verify before minting.");
    console.log("   Admin wallet needs to call: verifyBrand(" + signer.address + ")");
    return;
  }

  if (!brandInfo.isVerified) {
    console.log("❌ Brand is registered but not verified yet.");
    console.log("   Ask admin to call: verifyBrand(" + signer.address + ")");
    return;
  }

  console.log("✅ Brand verified:", brandInfo.name);

  // ── STEP 2: Mint the product ──
  console.log("\n🔨 Step 2: Minting product...");
  console.log("   Product:", PRODUCT.productName);
  console.log("   Serial:", PRODUCT.serialNumber);
  console.log("   Category:", PRODUCT.category);
  console.log("   Type:", PRODUCT.tokenType === 0 ? "Transferable" : "Soulbound");

  let tx;
  try {
    tx = await registry.mintProduct(
      PRODUCT.to,
      PRODUCT.productName,
      PRODUCT.serialNumber,
      PRODUCT.category,
      PRODUCT.tokenType,
      PRODUCT.tokenURI
    );
  } catch (error) {
    if (error.message.includes("serial number already registered")) {
      console.log("❌ Serial number already registered! Use a different serial.");
      return;
    }
    throw error;
  }

  console.log("   Transaction sent:", tx.hash);
  console.log("   Waiting for confirmation...");

  const receipt = await tx.wait();
  await new Promise(resolve => setTimeout(resolve, 3000));
  console.log("✅ Product minted! Block:", receipt.blockNumber);

  // ── STEP 3: Extract tokenId from event ──
  console.log("\n🔍 Step 3: Extracting token ID...");

  let tokenId;
  for (const log of receipt.logs) {
    try {
      const parsed = registry.interface.parseLog(log);
      if (parsed.name === "ProductMinted") {
        tokenId = parsed.args[0];
        break;
      }
    } catch { continue; }
  }

  if (!tokenId) {
    console.log("❌ Could not find tokenId in transaction logs.");
    return;
  }

  console.log("✅ Token ID:", tokenId.toString());

  // ── STEP 4: Verify on-chain ──
  console.log("\n🔐 Step 4: Verifying authenticity on-chain...");
  const isAuthentic = await registry.isAuthentic(tokenId);
  console.log("✅ isAuthentic:", isAuthentic);

  const product = await registry.getProduct(tokenId);
  console.log("✅ Product data confirmed on-chain:");
  console.log("   Name:", product.productName);
  console.log("   Serial:", product.serialNumber);
  console.log("   Brand:", product.brand);

  // ── STEP 5: Generate QR URL ──
  console.log("\n📱 Step 5: Generating QR Code URL...");
  const verifyUrl = `${FRONTEND_URL}/verify?tokenId=${tokenId.toString()}`;
  const basescanUrl = `https://sepolia.basescan.org/token/${PRODUCT_REGISTRY_ADDRESS}?a=${tokenId.toString()}`;

  console.log("\n─────────────────────────────────────────────────");
  console.log("🎉 PRODUCT SUCCESSFULLY MINTED!");
  console.log("─────────────────────────────────────────────────");
  console.log("📦 Product:   ", PRODUCT.productName);
  console.log("🔢 Token ID:  ", tokenId.toString());
  console.log("🔑 Serial:    ", PRODUCT.serialNumber);
  console.log("👛 Owner:     ", PRODUCT.to);
  console.log("─────────────────────────────────────────────────");
  console.log("📱 QR Code URL (give this to frontend):");
  console.log("  ", verifyUrl);
  console.log("\n🔍 View on Basescan:");
  console.log("  ", basescanUrl);
  console.log("─────────────────────────────────────────────────");
  console.log("\n💡 Next steps:");
  console.log("   1. Pass the QR URL to your frontend partner");
  console.log("   2. They generate a QR code from this URL");
  console.log("   3. Print/display it on the physical product");
  console.log("   4. Consumer scans it → calls verifyProduct(" + tokenId.toString() + ")");
  console.log("─────────────────────────────────────────────────\n");
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exitCode = 1;
});