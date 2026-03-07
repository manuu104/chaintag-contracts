# ChainTag — Universal Onchain Product Authenticity Platform

> Built for Base Batches 003 — Student Track

[![Solidity](https://img.shields.io/badge/Solidity-0.8.28-blue)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow)](https://hardhat.org/)
[![Base Sepolia](https://img.shields.io/badge/Network-Base%20Sepolia-0052FF)](https://sepolia.basescan.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

## Overview

ChainTag is a universal onchain product authenticity platform built on Base. It allows brands to mint unique NFT tokens for their physical products, and consumers to verify authenticity by scanning a QR code or NFC tag with their phone.

### The Problem
Counterfeit goods cost the global economy trillions of dollars annually. Existing solutions are centralized, brand-specific, and give consumers no power or rewards.

### The Solution
- **Brands** register and mint a unique token per physical product
- **Consumers** scan a QR/NFC tag to instantly verify authenticity
- **Verification** automatically activates warranty, logs scan history, and rewards the consumer with points
- Supports both **Transferable NFTs** (retail/luxury) and **Soulbound tokens** (medicine/food)

---

## Live Deployment

| Contract | Address | Network |
|---|---|---|
| ProductRegistry | [`0x6D123b6718fe2018c6D643cd641Db9DB1Bf339bB`](https://sepolia.basescan.org/address/0x6D123b6718fe2018c6D643cd641Db9DB1Bf339bB) | Base Sepolia |
| VerificationLog | [`0x3eD2c8E280c2D67cCE8943441AA7cA9a2024B5dD`](https://sepolia.basescan.org/address/0x3eD2c8E280c2D67cCE8943441AA7cA9a2024B5dD) | Base Sepolia |

---

## Features

- **Universal** — works for any brand, any product category
- **Dual token types** — Transferable ERC-721 for retail, Soulbound for medicine
- **Anti-counterfeit** — duplicate serial numbers are blocked on-chain
- **Auto warranty** — activates on first scan (proof of purchase)
- **Reward points** — consumers earn points every time they scan
- **Scan history** — every scan logged permanently on-chain with GPS
- **Product recall** — brands can deactivate compromised products
- **Mobile-first** — QR code + NFC, works on any phone

---

## Architecture

```
ProductRegistry.sol
├── Brand registration (two-step: register → admin verify)
├── Product minting (Transferable or Soulbound)
├── Soulbound enforcement (blocks transfer on medicine tokens)
├── Product deactivation (recall system)
└── Authenticity verification

VerificationLog.sol
├── Scan event logging (scanner, timestamp, GPS, authenticity)
├── Warranty activation (triggers on first scan)
├── Reward points (10 points per authentic scan)
└── Product summary (single call for frontend display)
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm or yarn

### Installation

```bash
git clone https://github.com/yourusername/chaintag-contracts
cd chaintag-contracts
npm install
```

### Environment Setup

Create a `.env` file:
```
PRIVATE_KEY_ADMIN=your_admin_private_key
PRIVATE_KEY_BRAND=your_brand_private_key
```

### Compile

```bash
npx hardhat compile
```

### Test

```bash
npx hardhat test
```

All 30 tests should pass:
```
ChainTag - Full Test Suite
  1. Brand Registration (4 tests)
  2. Brand Verification (4 tests)
  3. Product Minting (5 tests)
  4. Soulbound Tokens (3 tests)
  5. Product Authenticity (5 tests)
  6. Verification & Scan History (5 tests)
  7. Warranty (5 tests)
  8. Rewards (4 tests)
  9. Product Summary (2 tests)

  30 passing
```

### Deploy

```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

---

## Scripts

| Script | Description |
|---|---|
| `deploy.js` | Deploy both contracts to Base Sepolia |
| `mintAndGetQR.js` | Mint a product and generate QR URL |
| `checkScans.js` | View all products and scan history |
| `verifyBrand.js` | Verify a brand wallet as admin |
| `setWarranty.js` | Set warranty duration for a brand |
| `checkBrand.js` | Check brand registration status |
| `checkProduct.js` | Check a specific product on-chain |

### Example Usage

```bash
# Mint a new product
npx hardhat run scripts/mintAndGetQR.js --network baseSepolia

# Check all scans
npx hardhat run scripts/checkScans.js --network baseSepolia
```

---

## Test Results

```
30 passing (12s)
```

Tests cover: brand registration, admin verification, product minting,
soulbound transfer blocking, authenticity checking, scan history,
warranty activation, reward points, and frontend summary function.

---

## Tech Stack

| Tool | Purpose |
|---|---|
| Solidity 0.8.28 | Smart contract language |
| Hardhat | Development framework |
| OpenZeppelin | ERC-721, Ownable contracts |
| ethers.js | Blockchain interaction |
| Base Sepolia | L2 testnet deployment |
| Mocha + Chai | Testing framework |

---

## Team

Built for **Base Batches 003 — Student Track**

- **Manuel** — Smart Contract Developer
- **Grace** — Frontend Developer

---

## License

MIT
