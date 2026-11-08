# GM-GN ☀️🌙

A minimal on-chain greeting dApp. Connect MetaMask, choose Base Mainnet or LitVM LiteForge Testnet, then publish a GM or GN greeting on the selected chain.

## Networks

| Network | Chain ID | Native gas token | RPC | Explorer |
|---|---:|---|---|---|
| Base Mainnet | 8453 | ETH | https://mainnet.base.org | https://basescan.org |
| LitVM LiteForge Testnet | 4441 | zkLTC | https://liteforge.rpc.caldera.xyz/http | https://liteforge.explorer.caldera.xyz |

LitVM parameters are taken from the [official LitVM wallet documentation](https://docs.litvm.com/get-started-on-testnet/add-to-wallet). LitVM is currently a testnet; do not treat it as a mainnet.

## Project structure

- `contracts/GMGN.sol` — greeting contract and events
- `frontend/` — Vite + React + ethers.js app
- `hardhat.config.cjs` — deployment networks
- `scripts/deploy.cjs` — deploy script

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
- Review the network and transaction details in MetaMask before confirming.

## Contract behavior

Each greeting emits an indexed event containing the sender and a timestamp, and increments per-wallet and global counters. There is no token transfer, fee, owner role, or rate limit. Anyone can call either function.

## Deployment status

The repository contains source code and deployment instructions. Contract addresses must be filled in after deployment; the dApp intentionally disables on-chain greeting buttons until the relevant address is configured.
