const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ChainTag - Full Test Suite", function () {

  let productRegistry;
  let verificationLog;
  let owner;        // admin / deployer
  let brand;        // brand wallet (e.g. Nike)
  let consumer;     // consumer wallet (e.g. end user)
  let otherUser;    // random third party

  // Reusable product data for testing
  const PRODUCT = {
    productName: "Air Jordan 1",
    serialNumber: "SN12345",
    category: "Footwear",
    tokenType: 0,         // 0 = Transferable
    tokenURI: "https://example.com/product.json"
  };

  const MEDICINE = {
    productName: "Vaccine Batch A",
    serialNumber: "MED001",
    category: "Medicine",
    tokenType: 1,         // 1 = Soulbound
    tokenURI: "https://example.com/med.json"
  };

  beforeEach(async function () {
    // Get test wallets
    [owner, brand, consumer, otherUser] = await ethers.getSigners();

    // Deploy ProductRegistry
    const ProductRegistry = await ethers.getContractFactory("ProductRegistry");
    productRegistry = await ProductRegistry.deploy();
    await productRegistry.waitForDeployment();

    // Deploy VerificationLog with ProductRegistry address
    const VerificationLog = await ethers.getContractFactory("VerificationLog");
    verificationLog = await VerificationLog.deploy(
      await productRegistry.getAddress()
    );
    await verificationLog.waitForDeployment();
  });

  // ─────────────────────────────────────────────
  // SECTION 1: BRAND REGISTRATION
  // ─────────────────────────────────────────────

  describe("1. Brand Registration", function () {

    it("Should allow a brand to register", async function () {
      await productRegistry.connect(brand).registerBrand("Nike");

      const brandInfo = await productRegistry.getBrand(brand.address);
      expect(brandInfo.name).to.equal("Nike");
      expect(brandInfo.wallet).to.equal(brand.address);
      expect(brandInfo.isVerified).to.equal(false);
    });

    it("Should emit BrandRegistered event", async function () {
      await expect(
        productRegistry.connect(brand).registerBrand("Nike")
      ).to.emit(productRegistry, "BrandRegistered")
        .withArgs(brand.address, "Nike");
    });

    it("Should NOT allow empty brand name", async function () {
      await expect(
        productRegistry.connect(brand).registerBrand("")
      ).to.be.revertedWith("ProductRegistry: name cannot be empty");
    });

    it("Should NOT allow same brand to register twice", async function () {
      await productRegistry.connect(brand).registerBrand("Nike");
      await expect(
        productRegistry.connect(brand).registerBrand("Nike Again")
      ).to.be.revertedWith("ProductRegistry: brand already registered");
    });

  });

  // ─────────────────────────────────────────────
  // SECTION 2: BRAND VERIFICATION (ADMIN)
  // ─────────────────────────────────────────────

  describe("2. Brand Verification", function () {

    beforeEach(async function () {
      // Register brand before each test in this section
      await productRegistry.connect(brand).registerBrand("Nike");
    });

    it("Should allow admin to verify a brand", async function () {
      await productRegistry.connect(owner).verifyBrand(brand.address);

      const brandInfo = await productRegistry.getBrand(brand.address);
      expect(brandInfo.isVerified).to.equal(true);
    });

    it("Should emit BrandVerified event", async function () {
      await expect(
        productRegistry.connect(owner).verifyBrand(brand.address)
      ).to.emit(productRegistry, "BrandVerified")
        .withArgs(brand.address);
    });

    it("Should NOT allow non-admin to verify a brand", async function () {
      await expect(
        productRegistry.connect(otherUser).verifyBrand(brand.address)
      ).to.be.revertedWithCustomError(productRegistry, "OwnableUnauthorizedAccount");
    });

    it("Should NOT verify a brand that hasn't registered", async function () {
      await expect(
        productRegistry.connect(owner).verifyBrand(otherUser.address)
      ).to.be.revertedWith("ProductRegistry: brand not registered");
    });

  });

  // ─────────────────────────────────────────────
  // SECTION 3: PRODUCT MINTING
  // ─────────────────────────────────────────────

  describe("3. Product Minting", function () {

    beforeEach(async function () {
      // Register and verify brand before each test
      await productRegistry.connect(brand).registerBrand("Nike");
      await productRegistry.connect(owner).verifyBrand(brand.address);
    });

    it("Should allow verified brand to mint a product", async function () {
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        PRODUCT.productName,
        PRODUCT.serialNumber,
        PRODUCT.category,
        PRODUCT.tokenType,
        PRODUCT.tokenURI
      );

      const product = await productRegistry.getProduct(1);
      expect(product.productName).to.equal("Air Jordan 1");
      expect(product.serialNumber).to.equal("SN12345");
      expect(product.category).to.equal("Footwear");
      expect(product.brand).to.equal(brand.address);
      expect(product.isActive).to.equal(true);
    });

    it("Should emit ProductMinted event", async function () {
      await expect(
        productRegistry.connect(brand).mintProduct(
          consumer.address,
          PRODUCT.productName,
          PRODUCT.serialNumber,
          PRODUCT.category,
          PRODUCT.tokenType,
          PRODUCT.tokenURI
        )
      ).to.emit(productRegistry, "ProductMinted")
        .withArgs(1, brand.address, "SN12345", 0);
    });

    it("Should NOT allow unverified brand to mint", async function () {
      await productRegistry.connect(otherUser).registerBrand("Fake Nike");
      await expect(
        productRegistry.connect(otherUser).mintProduct(
          consumer.address,
          PRODUCT.productName,
          PRODUCT.serialNumber,
          PRODUCT.category,
          PRODUCT.tokenType,
          PRODUCT.tokenURI
        )
      ).to.be.revertedWith("ProductRegistry: not a verified brand");
    });

    it("Should NOT allow duplicate serial numbers", async function () {
      // Mint first product
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        PRODUCT.productName,
        PRODUCT.serialNumber,
        PRODUCT.category,
        PRODUCT.tokenType,
        PRODUCT.tokenURI
      );

      // Try to mint same serial again
      await expect(
        productRegistry.connect(brand).mintProduct(
          consumer.address,
          "Fake Air Jordan",
          PRODUCT.serialNumber, // same serial!
          PRODUCT.category,
          PRODUCT.tokenType,
          PRODUCT.tokenURI
        )
      ).to.be.revertedWith("ProductRegistry: serial number already registered");
    });

    it("Should correctly assign token ownership to recipient", async function () {
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        PRODUCT.productName,
        PRODUCT.serialNumber,
        PRODUCT.category,
        PRODUCT.tokenType,
        PRODUCT.tokenURI
      );

      const tokenOwner = await productRegistry.ownerOf(1);
      expect(tokenOwner).to.equal(consumer.address);
    });

  });

  // ─────────────────────────────────────────────
  // SECTION 4: SOULBOUND TOKENS
  // ─────────────────────────────────────────────

  describe("4. Soulbound Tokens (Medicine Use Case)", function () {

    beforeEach(async function () {
      await productRegistry.connect(brand).registerBrand("Pfizer");
      await productRegistry.connect(owner).verifyBrand(brand.address);

      // Mint a soulbound medicine token
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        MEDICINE.productName,
        MEDICINE.serialNumber,
        MEDICINE.category,
        MEDICINE.tokenType,
        MEDICINE.tokenURI
      );
    });

    it("Should correctly mark token as soulbound", async function () {
      const isSoulbound = await productRegistry.isSoulbound(1);
      expect(isSoulbound).to.equal(true);
    });

    it("Should NOT allow soulbound token to be transferred", async function () {
      await expect(
        productRegistry.connect(consumer).transferFrom(
          consumer.address,
          otherUser.address,
          1
        )
      ).to.be.revertedWith("ProductRegistry: Soulbound token cannot be transferred");
    });

    it("Should allow transferable token to be transferred", async function () {
      // Mint a transferable token
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        "Air Jordan 1",
        "SN-TRANSFER-001",
        "Footwear",
        0, // transferable
        "https://example.com/shoe.json"
      );

      // Transfer should succeed
      await productRegistry.connect(consumer).transferFrom(
        consumer.address,
        otherUser.address,
        2 // tokenId 2
      );

      const newOwner = await productRegistry.ownerOf(2);
      expect(newOwner).to.equal(otherUser.address);
    });

  });

  // ─────────────────────────────────────────────
  // SECTION 5: PRODUCT AUTHENTICITY
  // ─────────────────────────────────────────────

  describe("5. Product Authenticity", function () {

    beforeEach(async function () {
      await productRegistry.connect(brand).registerBrand("Nike");
      await productRegistry.connect(owner).verifyBrand(brand.address);
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        PRODUCT.productName,
        PRODUCT.serialNumber,
        PRODUCT.category,
        PRODUCT.tokenType,
        PRODUCT.tokenURI
      );
    });

    it("Should return true for authentic active product", async function () {
      const authentic = await productRegistry.isAuthentic(1);
      expect(authentic).to.equal(true);
    });

    it("Should return false for non-existent product", async function () {
      const authentic = await productRegistry.isAuthentic(999);
      expect(authentic).to.equal(false);
    });

    it("Should return false after product is deactivated", async function () {
      await productRegistry.connect(brand).deactivateProduct(1);
      const authentic = await productRegistry.isAuthentic(1);
      expect(authentic).to.equal(false);
    });

    it("Should emit ProductDeactivated event", async function () {
      await expect(
        productRegistry.connect(brand).deactivateProduct(1)
      ).to.emit(productRegistry, "ProductDeactivated")
        .withArgs(1);
    });

    it("Should NOT allow other brands to deactivate a product", async function () {
      await productRegistry.connect(otherUser).registerBrand("Adidas");
      await productRegistry.connect(owner).verifyBrand(otherUser.address);

      await expect(
        productRegistry.connect(otherUser).deactivateProduct(1)
      ).to.be.revertedWith("ProductRegistry: not the product's brand");
    });

  });

  // ─────────────────────────────────────────────
  // SECTION 6: VERIFICATION & SCAN HISTORY
  // ─────────────────────────────────────────────

  describe("6. Verification & Scan History", function () {

    beforeEach(async function () {
      await productRegistry.connect(brand).registerBrand("Nike");
      await productRegistry.connect(owner).verifyBrand(brand.address);
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        PRODUCT.productName,
        PRODUCT.serialNumber,
        PRODUCT.category,
        PRODUCT.tokenType,
        PRODUCT.tokenURI
      );
    });

    it("Should log a scan event when product is verified", async function () {
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");

      const scanCount = await verificationLog.getScanCount(1);
      expect(scanCount).to.equal(1);
    });

    it("Should return correct scan history", async function () {
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");

      const history = await verificationLog.getScanHistory(1);
      expect(history[0].scanner).to.equal(consumer.address);
      expect(history[0].location).to.equal("Manila, PH");
      expect(history[0].isAuthentic).to.equal(true);
    });

    it("Should accumulate multiple scans", async function () {
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");
      await verificationLog.connect(otherUser).verifyProduct(1, "Cebu, PH");
      await verificationLog.connect(brand).verifyProduct(1, "Tokyo, JP");

      const scanCount = await verificationLog.getScanCount(1);
      expect(scanCount).to.equal(3);
    });

    it("Should mark fake product scan as not authentic", async function () {
      // Deactivate product first
      await productRegistry.connect(brand).deactivateProduct(1);

      // Scan it
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");

      const history = await verificationLog.getScanHistory(1);
      expect(history[0].isAuthentic).to.equal(false);
    });

    it("Should emit ProductVerified event", async function () {
      await expect(
        verificationLog.connect(consumer).verifyProduct(1, "Manila, PH")
      ).to.emit(verificationLog, "ProductVerified")
        .withArgs(1, consumer.address, true, await ethers.provider.getBlock("latest").then(b => b.timestamp + 1));
    });

  });

  // ─────────────────────────────────────────────
  // SECTION 7: WARRANTY
  // ─────────────────────────────────────────────

  describe("7. Warranty", function () {

    beforeEach(async function () {
      await productRegistry.connect(brand).registerBrand("Nike");
      await productRegistry.connect(owner).verifyBrand(brand.address);
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        PRODUCT.productName,
        PRODUCT.serialNumber,
        PRODUCT.category,
        PRODUCT.tokenType,
        PRODUCT.tokenURI
      );

      // Set warranty duration to 365 days
      await verificationLog.connect(brand).setBrandWarrantyDuration(365);
    });

    it("Should activate warranty on first scan", async function () {
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");

      const warranty = await verificationLog.getWarranty(1);
      expect(warranty.isActive).to.equal(true);
      expect(warranty.owner).to.equal(consumer.address);
    });

    it("Should set correct warranty expiry (365 days)", async function () {
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");

      const warranty = await verificationLog.getWarranty(1);
      const block = await ethers.provider.getBlock("latest");
      const expectedExpiry = block.timestamp + (365 * 24 * 60 * 60);

      // Allow 5 second tolerance for block timing
      expect(Number(warranty.expiresAt)).to.be.closeTo(expectedExpiry, 5);
    });

    it("Should return warranty as valid right after activation", async function () {
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");

      const isValid = await verificationLog.isWarrantyValid(1);
      expect(isValid).to.equal(true);
    });

    it("Should NOT activate warranty if brand hasn't set duration", async function () {
      // Deploy fresh contracts with no warranty duration set
      const ProductRegistry2 = await ethers.getContractFactory("ProductRegistry");
      const registry2 = await ProductRegistry2.deploy();
      const VerificationLog2 = await ethers.getContractFactory("VerificationLog");
      const verLog2 = await VerificationLog2.deploy(await registry2.getAddress());

      await registry2.connect(brand).registerBrand("Nike2");
      await registry2.connect(owner).verifyBrand(brand.address);
      await registry2.connect(brand).mintProduct(
        consumer.address, "Air Max", "SN-NOWARRANTY", "Footwear", 0, "https://example.com"
      );

      await verLog2.connect(consumer).verifyProduct(1, "Manila, PH");

      const warranty = await verLog2.getWarranty(1);
      expect(warranty.activatedAt).to.equal(0); // not activated
    });

    it("Should emit WarrantyActivated event on first scan", async function () {
      await expect(
        verificationLog.connect(consumer).verifyProduct(1, "Manila, PH")
      ).to.emit(verificationLog, "WarrantyActivated");
    });

  });

  // ─────────────────────────────────────────────
  // SECTION 8: REWARDS
  // ─────────────────────────────────────────────

  describe("8. Rewards", function () {

    beforeEach(async function () {
      await productRegistry.connect(brand).registerBrand("Nike");
      await productRegistry.connect(owner).verifyBrand(brand.address);
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        PRODUCT.productName,
        PRODUCT.serialNumber,
        PRODUCT.category,
        PRODUCT.tokenType,
        PRODUCT.tokenURI
      );
    });

    it("Should earn 10 points per scan", async function () {
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");

      const points = await verificationLog.getUserPoints(consumer.address);
      expect(points).to.equal(10);
    });

    it("Should accumulate points across multiple scans", async function () {
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");
      await verificationLog.connect(consumer).verifyProduct(1, "Cebu, PH");
      await verificationLog.connect(consumer).verifyProduct(1, "Tokyo, JP");

      const points = await verificationLog.getUserPoints(consumer.address);
      expect(points).to.equal(30);
    });

    it("Should NOT earn points for fake/deactivated products", async function () {
      await productRegistry.connect(brand).deactivateProduct(1);
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");

      const points = await verificationLog.getUserPoints(consumer.address);
      expect(points).to.equal(0);
    });

    it("Should emit RewardPointsEarned event", async function () {
      await expect(
        verificationLog.connect(consumer).verifyProduct(1, "Manila, PH")
      ).to.emit(verificationLog, "RewardPointsEarned")
        .withArgs(consumer.address, 10, 1);
    });

  });

  // ─────────────────────────────────────────────
  // SECTION 9: PRODUCT SUMMARY (FRONTEND FUNCTION)
  // ─────────────────────────────────────────────

  describe("9. Product Summary (Frontend)", function () {

    beforeEach(async function () {
      await productRegistry.connect(brand).registerBrand("Nike");
      await productRegistry.connect(owner).verifyBrand(brand.address);
      await productRegistry.connect(brand).mintProduct(
        consumer.address,
        PRODUCT.productName,
        PRODUCT.serialNumber,
        PRODUCT.category,
        PRODUCT.tokenType,
        PRODUCT.tokenURI
      );
      await verificationLog.connect(brand).setBrandWarrantyDuration(365);
      await verificationLog.connect(consumer).verifyProduct(1, "Manila, PH");
    });

    it("Should return correct product summary after scan", async function () {
      const summary = await verificationLog.getProductSummary(1);

      expect(summary.authentic).to.equal(true);
      expect(summary.totalScans).to.equal(1);
      expect(summary.warrantyActive).to.equal(true);
      expect(summary.points).to.equal(10);
    });

    it("Should show not authentic in summary for deactivated product", async function () {
      await productRegistry.connect(brand).deactivateProduct(1);
      const summary = await verificationLog.getProductSummary(1);
      expect(summary.authentic).to.equal(false);
    });

  });

});