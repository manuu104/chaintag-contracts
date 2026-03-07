const hre = require("hardhat");

const PRODUCT_REGISTRY_ADDRESS = "0x6D123b6718fe2018c6D643cd641Db9DB1Bf339bB";
const WALLET = "0xB76F967931be7c9031dD90331B46683E6fDBF5F2";

async function main() {
  const registry = await hre.ethers.getContractAt(
    "ProductRegistry",
    PRODUCT_REGISTRY_ADDRESS
  );

  const [signer] = await hre.ethers.getSigners();
  console.log("Signer (admin):", signer.address);

  const owner = await registry.owner();
  console.log("Contract owner:", owner);
  console.log("Is signer the owner?", signer.address.toLowerCase() === owner.toLowerCase());

  const brandInfo = await registry.getBrand(WALLET);
  console.log("\nBrand info:");
  console.log("  name:", brandInfo.name);
  console.log("  wallet:", brandInfo.wallet);
  console.log("  isVerified:", brandInfo.isVerified);
}

main().catch(console.error);