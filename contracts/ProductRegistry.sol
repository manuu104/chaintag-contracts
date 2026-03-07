// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ProductRegistry
 * @dev Universal Onchain Product Authenticity Platform
 *      Supports both transferable (ERC-721) and Soulbound tokens
 *      Brands register themselves, then mint tokens per product
 */
contract ProductRegistry is ERC721URIStorage, Ownable {

    // ─────────────────────────────────────────────
    // ENUMS & STRUCTS
    // ─────────────────────────────────────────────

    enum TokenType { Transferable, Soulbound }

    struct Brand {
        string name;            // e.g. "Nike", "Pfizer"
        address wallet;         // brand's registered wallet
        bool isVerified;        // admin verifies brand to prevent fake brands
        uint256 registeredAt;
    }

    struct Product {
        uint256 tokenId;
        string productName;     // e.g. "Air Jordan 1 Retro"
        string serialNumber;    // unique serial from manufacturer
        string category;        // e.g. "Footwear", "Medicine", "Electronics"
        address brand;          // which brand minted this
        TokenType tokenType;    // Transferable or Soulbound
        uint256 mintedAt;
        bool isActive;          // brand can deactivate (e.g. recalled medicine)
    }

    // ─────────────────────────────────────────────
    // STATE VARIABLES
    // ─────────────────────────────────────────────

    uint256 private _tokenIdCounter;

    // brand wallet address => Brand info
    mapping(address => Brand) public brands;

    // tokenId => Product info
    mapping(uint256 => Product) public products;

    // serialNumber => tokenId (to prevent duplicate serials per brand)
    mapping(address => mapping(string => uint256)) public brandSerialToTokenId;

    // tokenId => is Soulbound
    mapping(uint256 => bool) private _isSoulbound;

    // ─────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────

    event BrandRegistered(address indexed brandWallet, string name);
    event BrandVerified(address indexed brandWallet);
    event ProductMinted(
        uint256 indexed tokenId,
        address indexed brand,
        string serialNumber,
        TokenType tokenType
    );
    event ProductDeactivated(uint256 indexed tokenId);

    // ─────────────────────────────────────────────
    // MODIFIERS
    // ─────────────────────────────────────────────

    modifier onlyVerifiedBrand() {
        require(brands[msg.sender].isVerified, "ProductRegistry: not a verified brand");
        _;
    }

    modifier productExists(uint256 tokenId) {
        require(products[tokenId].mintedAt != 0, "ProductRegistry: product does not exist");
        _;
    }

    // ─────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────

    constructor() ERC721("ChainTag Product", "CTAG") Ownable(msg.sender) {}

    // ─────────────────────────────────────────────
    // BRAND FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @dev Any brand can self-register, but must be verified by admin before minting
     * @param name The brand's display name
     */
    function registerBrand(string memory name) external {
        require(bytes(name).length > 0, "ProductRegistry: name cannot be empty");
        require(brands[msg.sender].wallet == address(0), "ProductRegistry: brand already registered");

        brands[msg.sender] = Brand({
            name: name,
            wallet: msg.sender,
            isVerified: false,      // admin must verify first
            registeredAt: block.timestamp
        });

        emit BrandRegistered(msg.sender, name);
    }

    /**
     * @dev Admin verifies a brand (prevents fake brands from registering)
     * @param brandWallet The wallet address of the brand to verify
     */
    function verifyBrand(address brandWallet) external onlyOwner {
        require(brands[brandWallet].wallet != address(0), "ProductRegistry: brand not registered");
        brands[brandWallet].isVerified = true;
        emit BrandVerified(brandWallet);
    }

    // ─────────────────────────────────────────────
    // MINTING FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @dev Verified brand mints a product token
     * @param to         Recipient wallet (could be brand itself or end consumer)
     * @param productName  Human-readable product name
     * @param serialNumber Manufacturer's unique serial
     * @param category   Product category (e.g. "Medicine", "Luxury", "Electronics")
     * @param tokenType  Transferable (0) or Soulbound (1)
     * @param tokenURI   IPFS link to product metadata (image, description, etc.)
     */
    function mintProduct(
        address to,
        string memory productName,
        string memory serialNumber,
        string memory category,
        TokenType tokenType,
        string memory tokenURI
    ) external onlyVerifiedBrand returns (uint256) {

        // Prevent duplicate serial numbers per brand
        require(
            brandSerialToTokenId[msg.sender][serialNumber] == 0,
            "ProductRegistry: serial number already registered"
        );

        _tokenIdCounter++;
        uint256 newTokenId = _tokenIdCounter;

        // Mint the token
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, tokenURI);

        // Mark as soulbound if needed
        if (tokenType == TokenType.Soulbound) {
            _isSoulbound[newTokenId] = true;
        }

        // Store product data
        products[newTokenId] = Product({
            tokenId: newTokenId,
            productName: productName,
            serialNumber: serialNumber,
            category: category,
            brand: msg.sender,
            tokenType: tokenType,
            mintedAt: block.timestamp,
            isActive: true
        });

        brandSerialToTokenId[msg.sender][serialNumber] = newTokenId;

        emit ProductMinted(newTokenId, msg.sender, serialNumber, tokenType);

        return newTokenId;
    }

    // ─────────────────────────────────────────────
    // SOULBOUND LOGIC
    // ─────────────────────────────────────────────

    /**
     * @dev Override transfer to block Soulbound tokens from being transferred
     *      address(0) as 'from' means it's a mint — that's always allowed
     */
    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override(ERC721, IERC721) {
        require(!_isSoulbound[tokenId], "ProductRegistry: Soulbound token cannot be transferred");
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        bytes memory data
    ) public override(ERC721, IERC721) {
        require(!_isSoulbound[tokenId], "ProductRegistry: Soulbound token cannot be transferred");
        super.safeTransferFrom(from, to, tokenId, data);
    }

    // ─────────────────────────────────────────────
    // PRODUCT MANAGEMENT
    // ─────────────────────────────────────────────

    /**
     * @dev Brand can deactivate a product (e.g. recalled medicine, stolen goods)
     */
    function deactivateProduct(uint256 tokenId) external productExists(tokenId) {
        require(products[tokenId].brand == msg.sender, "ProductRegistry: not the product's brand");
        products[tokenId].isActive = false;
        emit ProductDeactivated(tokenId);
    }

    // ─────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @dev Get full product details by tokenId
     */
    function getProduct(uint256 tokenId) external view productExists(tokenId) returns (Product memory) {
        return products[tokenId];
    }

    /**
     * @dev Check if a product is authentic and active
     */
    function isAuthentic(uint256 tokenId) external view returns (bool) {
        if (products[tokenId].mintedAt == 0) return false;
        return products[tokenId].isActive;
    }

    /**
     * @dev Check if a token is soulbound
     */
    function isSoulbound(uint256 tokenId) external view returns (bool) {
        return _isSoulbound[tokenId];
    }

    /**
     * @dev Get brand info
     */
    function getBrand(address brandWallet) external view returns (Brand memory) {
        return brands[brandWallet];
    }
}
