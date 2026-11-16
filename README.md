# GM-GN ☀️🌙

**GM-GN** is a lightweight on-chain greeting dApp for sending public **GM** (Good Morning) and **GN** (Good Night) messages. Connect an injected wallet, select a supported network, and publish a greeting directly on-chain.

<p align="center">
  <a href="https://nabibolat.github.io/GM-GN/"><strong>Open the live app</strong></a>
  ·
  <a href="https://github.com/Nabibolat/GM-GN">Source code</a>
</p>

## At a glance

- Send GM and GN greetings through simple wallet transactions.
- Read per-wallet and global greeting counters.
- Supports Base Mainnet, LitVM LiteForge Testnet, and GIWA Sepolia.
- Adds ERC-8021 Builder Code attribution to Base Mainnet greeting transactions.
- Built with Solidity, React, Vite, and ethers.js.

## Deployed contracts

| Network | Chain ID | Contract | Explorer status |
|---|---:|---|---|
| Base Mainnet | 8453 | [`0x9B62577c1f7C551F98f181FDd0B08e73B280C6a8`](https://basescan.org/address/0x9B62577c1f7C551F98f181FDd0B08e73B280C6a8) | [Source verified — exact match](https://basescan.org/address/0x9B62577c1f7C551F98f181FDd0B08e73B280C6a8#code) |
| LitVM LiteForge Testnet | 4441 | [`0x331B2d0BC5E2A819117Bd4F552563F045d757b1B`](https://liteforge.explorer.caldera.xyz/address/0x331B2d0BC5E2A819117Bd4F552563F045d757b1B) | Verification not confirmed |
| GIWA Sepolia | 91342 | [`0x7f89a232767C64aEe9e74323aaAfB806d2709025`](https://sepolia-explorer.giwa.io/address/0x7f89a232767C64aEe9e74323aaAfB806d2709025) | Verification not confirmed |

### Base contract verification

The Base Mainnet contract source is published and marked **Exact Match** by BaseScan.

- Contract: `GMGN`
- Compiler: `v0.8.30+commit.73712a01`
- License: MIT
- Source: [GMGN.sol on BaseScan](https://basescan.org/address/0x9B62577c1f7C551F98f181FDd0B08e73B280C6a8#code)

**Verification is not a security audit.** BaseScan currently indicates that no contract security audit has been submitted. Exact-match source verification confirms correspondence between the published source and deployed bytecode; it does not constitute an independent security assessment.

## ERC-8021 Builder Code attribution

Base Mainnet GM/GN transactions include the registered ERC-8021 Builder Code:

```text
bc_f1pfmy4r
```

The frontend appends the attribution suffix to transaction calldata **on Base Mainnet only**. Transactions on LitVM and GIWA are sent without this Base-specific suffix. Attribution metadata does not change the GM-GN contract logic.

### On-chain attribution evidence

The following Base Mainnet transactions succeeded and were checked with an ERC-8021 attribution validator. The validator reported **“8021 Attributed”**, the canonical registry schema (`00`), and Builder Code `bc_f1pfmy4r`.

| Action | Transaction |
|---|---|
| Say GM | [View transaction on BaseScan](https://basescan.org/tx/0x47aef1e3352782073f43999e235f0969f0b181ecf1c8f11f8a7a99e5182195f2) |
| Say GN | [View transaction on BaseScan](https://basescan.org/tx/0x1821f3cf9d14f6e791f29557b6eb96254435d40bd1cd9f2d171cf2fa65e629d7) |

These examples demonstrate that the Builder Code is encoded in the transaction calldata. **Attribution does not guarantee Builder Rewards, grants, payouts, or program eligibility**; those depend on the applicable program rules and independent review.

## Networks

| Network | Chain ID | Native gas token | RPC | Explorer |
|---|---:|---|---|---|
| Base Mainnet | 8453 | ETH | https://mainnet.base.org | https://basescan.org |
| LitVM LiteForge Testnet | 4441 | zkLTC | https://liteforge.rpc.caldera.xyz/http | https://liteforge.explorer.caldera.xyz |
| GIWA Sepolia | 91342 | ETH | https://sepolia-rpc.giwa.io | https://sepolia-explorer.giwa.io |

LitVM parameters are taken from the [official LitVM wallet documentation](https://docs.litvm.com/get-started-on-testnet/add-to-wallet). LitVM is a testnet; do not treat it as a mainnet.

## Project structure

- `contracts/GMGN.sol` — greeting contract and events
- `frontend/` — Vite + React + ethers.js app
- `hardhat.config.cjs` — deployment networks
- `scripts/deploy.cjs` — deployment script

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
cp .env.example .env
# Add a deployer private key to .env only when you are ready to deploy.
npm run compile
npm run deploy:litvm
# or
npm run deploy:base
```

After deployment, copy the printed contract address into `frontend/.env` as `VITE_GMGN_BASE_ADDRESS` and/or `VITE_GMGN_LITVM_ADDRESS`.

Run the frontend:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Wallet safety

- Never put a wallet seed phrase or private key in the frontend.
- Never commit `.env` files. The deployer private key is used only by the local Hardhat process.
- The app requests a wallet signature only when the user presses GM or GN. Each greeting is a blockchain transaction and requires gas in the selected network.
- Review the network and transaction details in your wallet before confirming.

## Contract behavior

Each greeting emits an indexed event containing the sender and a timestamp, and increments per-wallet and global counters. There is no token transfer, fee, owner role, or rate limit. Anyone can call either function.

## Deployment status

The Base Mainnet, LitVM Testnet, and GIWA Sepolia contract addresses are configured in the frontend and GitHub Pages deployment workflow. The dApp reads counters and sends GM/GN transactions on the selected network.
