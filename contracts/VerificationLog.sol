// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "./ProductRegistry.sol";

/**
 * @title VerificationLog
 * @dev Handles product verification scans, logs history, and manages rewards/warranty
 *      Reads from ProductRegistry to confirm authenticity
 */
contract VerificationLog {

    // ─────────────────────────────────────────────
    // STRUCTS
    // ─────────────────────────────────────────────

    struct ScanEvent {
        uint256 tokenId;
        address scanner;      
        uint256 scannedAt;
        string location;        
        bool isAuthentic;      
    }

    struct WarrantyInfo {
        uint256 tokenId;
        address owner;         
        uint256 activatedAt;
        uint256 expiresAt;      
        bool isActive;
    }


    ProductRegistry public registry;  

    mapping(uint256 => ScanEvent[]) public scanHistory;
    mapping(uint256 => WarrantyInfo) public warranties;
    mapping(uint256 => uint256) public rewardPoints;
    mapping(address => uint256) public brandWarrantyDuration;
    mapping(address => uint256) public userTotalPoints;

    // v2: prevents point farming — tracks if wallet already claimed points for a product
    mapping(uint256 => mapping(address => bool)) public hasClaimedPoints;

    uint256 public constant POINTS_PER_SCAN = 10;

    // ─────────────────────────────────────────────
    // EVENTS
    // ─────────────────────────────────────────────

    event ProductVerified(
        uint256 indexed tokenId,
        address indexed scanner,
        bool isAuthentic,
        uint256 timestamp
    );
    event WarrantyActivated(uint256 indexed tokenId, address indexed owner, uint256 expiresAt);
    event RewardPointsEarned(address indexed user, uint256 points, uint256 tokenId);

    // ─────────────────────────────────────────────
    // CONSTRUCTOR
    // ─────────────────────────────────────────────

    constructor(address registryAddress) {
        registry = ProductRegistry(registryAddress);
    }

    // ─────────────────────────────────────────────
    // VERIFICATION FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @dev Main function called when user scans QR/NFC
     *      Logs the scan, checks authenticity, activates warranty on first scan,
     *      and rewards the scanner
     * @param tokenId   The product token ID from the QR/NFC
     * @param location  Optional location string
     */
    function verifyProduct(
        uint256 tokenId,
        string memory location
    ) external returns (bool authentic) {

        // Check authenticity from registry
        authentic = registry.isAuthentic(tokenId);

        // Log the scan event
        scanHistory[tokenId].push(ScanEvent({
            tokenId: tokenId,
            scanner: msg.sender,
            scannedAt: block.timestamp,
            location: location,
            isAuthentic: authentic
        }));

        // Only reward and activate warranty for authentic products
        if (authentic) {

            // Activate warranty on FIRST scan (first consumer scan = purchase proof)
            if (scanHistory[tokenId].length == 1) {
                _activateWarranty(tokenId);
            }

            // v2: Only give points once per wallet per product (anti-farming)
            if (!hasClaimedPoints[tokenId][msg.sender]) {
                hasClaimedPoints[tokenId][msg.sender] = true;
                _rewardScanner(tokenId, msg.sender);
            }
        }

        emit ProductVerified(tokenId, msg.sender, authentic, block.timestamp);

        return authentic;
    }

    // ─────────────────────────────────────────────
    // WARRANTY FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @dev Brand sets their warranty duration (in days)
     * @param durationInDays  e.g. 365 for 1 year warranty
     */
    function setBrandWarrantyDuration(uint256 durationInDays) external {
        ProductRegistry.Brand memory brand = registry.getBrand(msg.sender);
        require(brand.isVerified, "VerificationLog: not a verified brand");
        brandWarrantyDuration[msg.sender] = durationInDays * 1 days;
    }

    /**
     * @dev Internal: activate warranty on first scan
     */
    function _activateWarranty(uint256 tokenId) internal {
        if (warranties[tokenId].activatedAt != 0) return; // already activated

        ProductRegistry.Product memory product = registry.getProduct(tokenId);
        uint256 duration = brandWarrantyDuration[product.brand];

        if (duration == 0) return; // brand hasn't set warranty duration

        uint256 expiresAt = block.timestamp + duration;

        warranties[tokenId] = WarrantyInfo({
            tokenId: tokenId,
            owner: msg.sender,
            activatedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true
        });

        emit WarrantyActivated(tokenId, msg.sender, expiresAt);
    }

    // ─────────────────────────────────────────────
    // REWARDS FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @dev Internal: reward scanner with points
     *      Can be extended later to mint reward tokens (ERC-20)
     */
    function _rewardScanner(uint256 tokenId, address scanner) internal {
        rewardPoints[tokenId] += POINTS_PER_SCAN;
        userTotalPoints[scanner] += POINTS_PER_SCAN;
        emit RewardPointsEarned(scanner, POINTS_PER_SCAN, tokenId);
    }

    // ─────────────────────────────────────────────
    // VIEW FUNCTIONS
    // ─────────────────────────────────────────────

    /**
     * @dev Get full scan history for a product
     */
    function getScanHistory(uint256 tokenId) external view returns (ScanEvent[] memory) {
        return scanHistory[tokenId];
    }

    /**
     * @dev Get total number of times a product was scanned
     */
    function getScanCount(uint256 tokenId) external view returns (uint256) {
        return scanHistory[tokenId].length;
    }

    /**
     * @dev Check warranty status
     */
    function getWarranty(uint256 tokenId) external view returns (WarrantyInfo memory) {
        return warranties[tokenId];
    }

    /**
     * @dev Check if warranty is still valid
     */
    function isWarrantyValid(uint256 tokenId) external view returns (bool) {
        WarrantyInfo memory w = warranties[tokenId];
        if (!w.isActive) return false;
        return block.timestamp <= w.expiresAt;
    }

    /**
     * @dev Get user's total reward points
     */
    function getUserPoints(address user) external view returns (uint256) {
        return userTotalPoints[user];
    }

    /**
     * @dev Check if a wallet has already claimed points for a product
     */
    function hasWalletClaimed(uint256 tokenId, address wallet) external view returns (bool) {
        return hasClaimedPoints[tokenId][wallet];
    }

    /**
     * @dev Quick summary of a product scan — useful for frontend display
     *      Returns everything the consumer sees after scanning
     */
    function getProductSummary(uint256 tokenId) external view returns (
        bool authentic,
        uint256 totalScans,
        bool warrantyActive,
        uint256 warrantyExpiry,
        uint256 points
    ) {
        authentic = registry.isAuthentic(tokenId);
        totalScans = scanHistory[tokenId].length;
        warrantyActive = this.isWarrantyValid(tokenId);
        warrantyExpiry = warranties[tokenId].expiresAt;
        points = rewardPoints[tokenId];
    }
}
