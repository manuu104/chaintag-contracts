const hre = require("hardhat");

const PRODUCT_REGISTRY_ADDRESS = "0x6D123b6718fe2018c6D643cd641Db9DB1Bf339bB";

async function main() {
  const registry = await hre.ethers.getContractAt(
    "ProductRegistry",
    PRODUCT_REGISTRY_ADDRESS
  );

  const product = await registry.getProduct(1);
  console.log("✅ Product found!");
  console.log("   Name:", product.productName);
  console.log("   Serial:", product.serialNumber);
  console.log("   Active:", product.isActive);
  console.log("\n📱 QR URL: http://localhost:3000/verify?tokenId=1");
}

main().catch(console.error);