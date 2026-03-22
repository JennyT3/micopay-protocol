# Micopay MVP

Micopay is a fast, secure, and decentralized P2P crypto-to-cash exchange protocol for the next generation of financial inclusion on Stellar.

## Core Features
- **Self-Custodial**: Users maintain control of their private keys.
- **Escrow-Based**: Secure trades via Soroban smart contract escrows.
- **HTLC Security**: Hashed Time-Locked Contracts ensure funds are only released with the correct secret or refunded after a timeout.
- **MXNe Support**: Optimized for the MXNet (MXNe) stablecoin and Stellar assets.

## Project Structure
- `micopay/contracts/escrow`: Soroban (Rust) smart contract.
- `micopay/backend`: Fastify (TypeScript) backend orchestrator.
- `micopay/sql`: Database schema for users, trades, and wallets.
- `micopay/scripts`: E2E testing and maintenance scripts.
- `micopay_mvp_plan.md`: Detailed implementation plan.
- `micopay_demo_plan.md`: Guide for deploying to testnet.

## Documentation
Refer to `micopay_mvp_plan.md` for the full technical specification and implementation roadmap.
