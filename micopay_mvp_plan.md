# 🍄 Micopay MVP — Plan de Implementación

> Documento generado por discusión de tres agentes especializados:
> - **Agente Soroban** (contratos Rust/Stellar)
> - **Agente Backend** (Fastify/TypeScript)
> - **Agente Integración** (Stellar SDK, XDR, flujo E2E)

---

## 🗂️ Estado de Implementación

| | Componente | Estado |
|---|---|---|
| ✅ | Smart Contract EscrowFactory (Rust/Soroban) | **Completo + revisado con stellar-dev skill** |
| ✅ | Backend Fastify/TypeScript (14 endpoints) | **Corriendo en localhost:3000** |
| ✅ | PostgreSQL schema + DB | **Corriendo en Docker** |
| ✅ | HTLC secret service (AES-256-GCM) | **Completo** |
| ✅ | TTL extension en contrato | **Corregido (fix crítico)** |
| ✅ | E2E test (11 pasos) | **Todos pasan** |
| ⏳ | Compilar contrato WASM | **Pendiente (requiere Rust toolchain)** |
| ⏳ | Deploy contrato a Stellar testnet | **Pendiente** |
| ⏳ | `MOCK_STELLAR=false` + contrato real | **Pendiente tras deploy** |
| ❌ | Frontend / UI | **Fuera del MVP** |

---

## 1. Alcance Exacto del MVP

### ✅ Se implementa

| Componente | Detalle | Estado |
|---|---|---|
| **Smart Contract EscrowFactory** | `lock`, `release`, `refund`, `get_trade`, `initialize` en Soroban/Rust | ✅ Completo |
| **Backend Fastify** | Auth (SEP-10 simplificado), CRUD de trades, flujo HTLC completo | ✅ Completo |
| **DB PostgreSQL** | Tablas `users`, `trades`, `wallets` — solo lo necesario para el flujo | ✅ Completo |
| **Secreto HTLC** | Generación, cifrado AES-256-GCM, descifrado, QR payload | ✅ Completo |
| **Verificación on-chain** | Lectura del estado del trade desde Soroban | ✅ Mock funcional / Real pendiente |
| **Script E2E** | Simulación completa del flujo: crear → lock → reveal → release | ✅ 11 pasos, todos pasan |

### ❌ NO se implementa (fuera del MVP)

- Integración con anchors (Etherfuse, AlfredPay)
- Blend Capital / yield on escrow
- ReputationRegistry y MicopayNFT contracts
- Chat cifrado efímero (WebSocket)
- Sistema de ubicación / mapa / ofertas nearby
- Notificaciones push (FCM)
- Jobs con BullMQ/Redis (timeouts, TTL monitoring)
- Payment rails (path payments, SPEI on/off ramp)
- Anti-Sybil checks y account funding real
- Admin endpoints (disputes, suspensions)

### 🔶 Se mockea

| Componente | Mock |
|---|---|
| Verificación on-chain | Mock que simula respuesta exitosa del RPC (toggle con env var `MOCK_STELLAR=true`) |
| Account funding | Se asume que las cuentas de testnet ya existen (friendbot) |
| Trustlines | Se omiten para MVP; en testnet se crearán manualmente |
| SEP-10 auth | Simplificado: challenge-response con verificación de firma Stellar real, pero sin el flujo SEP-10 completo |

---

## 2. Estructura de Archivos

```
micopay/
├── contracts/                          # Smart contracts Soroban
│   └── escrow/
│       ├── Cargo.toml                  # Dependencias del contrato Rust
│       └── src/
│           ├── lib.rs                  # Contrato EscrowFactory completo
│           ├── types.rs                # Structs: TradeEscrow, TradeStatus
│           ├── errors.rs               # Enum de errores del contrato
│           └── test.rs                 # Tests unitarios del contrato
│
├── backend/                            # Servidor Fastify/TypeScript
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                    # Template variables de entorno
│   ├── drizzle.config.ts              # Config de Drizzle ORM
│   └── src/
│       ├── index.ts                    # Entry point: inicializa Fastify + plugins
│       ├── config.ts                   # Lectura y validación de env vars
│       │
│       ├── db/
│       │   ├── schema.ts              # Esquema Drizzle (users, trades, wallets)
│       │   ├── migrate.ts             # Script de migración
│       │   └── seed.ts                # Seed data para desarrollo
│       │
│       ├── routes/
│       │   ├── auth.ts                # POST /auth/challenge, POST /auth/token
│       │   ├── users.ts               # POST /users/register, GET /users/me
│       │   ├── trades.ts              # CRUD completo del trade flow
│       │   └── stellar.ts            # POST /stellar/submit
│       │
│       ├── services/
│       │   ├── stellar.service.ts     # Interacción con Soroban RPC
│       │   ├── secret.service.ts      # Generación, cifrado y descifrado HTLC
│       │   └── trade.service.ts       # Lógica de negocio del trade
│       │
│       ├── middleware/
│       │   └── auth.middleware.ts     # Verificación JWT
│       │
│       └── utils/
│           └── errors.ts              # Custom errors (NotFound, Forbidden, etc.)
│
├── scripts/
│   └── e2e-test.ts                    # Script de prueba end-to-end
│
├── sql/
│   └── init.sql                       # DDL completo listo para ejecutar
│
└── README.md
```

---

## 3. Contrato Soroban — EscrowFactory (Rust Completo)

### Decisiones de diseño tomadas por Agente Soroban

1. **trade_id**: se genera como hash de `(seller, buyer, secret_hash, timestamp)` — determinístico y único.
2. **Token**: se usa SAC de MXNe via `token::Client`. El contrato recibe la dirección del token SAC en `initialize`.
3. **Timeout**: se almacena como ledger number absoluto (`env.ledger().sequence() + minutes * 12`), no timestamp.
4. **Platform fee**: se transfiere a la wallet de la plataforma al hacer `release`, no al hacer `lock`.
5. **emergency_refund y resolve_dispute**: omitidos del MVP — se implementará solo el flujo happy path + refund por timeout.

### `contracts/escrow/Cargo.toml`

```toml
[package]
name = "micopay-escrow"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
soroban-sdk = "21.7.6"
soroban-token-sdk = "21.7.6"

[dev-dependencies]
soroban-sdk = { version = "21.7.6", features = ["testutils"] }

[profile.release]
opt-level = "z"
overflow-checks = true
debug = 0
strip = "symbols"
debug-assertions = false
panic = "abort"
codegen-units = 1
lto = true

[profile.release-with-logs]
inherits = "release"
debug-assertions = true
```

### `contracts/escrow/src/errors.rs`

```rust
use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum EscrowError {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    TradeNotFound = 3,
    InvalidSecret = 4,
    TradeNotLocked = 5,
    TimeoutNotReached = 6,
    TimeoutReached = 7,
    Unauthorized = 8,
    InsufficientAmount = 9,
}
```

### `contracts/escrow/src/types.rs`

```rust
use soroban_sdk::{contracttype, Address, BytesN};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum TradeStatus {
    Locked,
    Released,
    Refunded,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct TradeEscrow {
    pub seller: Address,
    pub buyer: Address,
    pub amount: i128,
    pub platform_fee: i128,
    pub secret_hash: BytesN<32>,
    pub timeout_ledger: u32,
    pub status: TradeStatus,
}

#[contracttype]
pub enum DataKey {
    Admin,
    TokenId,
    PlatformWallet,
    Trade(BytesN<32>),
}
```

### `contracts/escrow/src/lib.rs`

```rust
#![no_std]

mod errors;
mod types;

use errors::EscrowError;
use types::{DataKey, TradeEscrow, TradeStatus};

use soroban_sdk::{
    contract, contractimpl, token, Address, Bytes, BytesN, Env,
    log,
};

fn compute_trade_id(env: &Env, seller: &Address, buyer: &Address, secret_hash: &BytesN<32>) -> BytesN<32> {
    let mut seed = Bytes::new(env);
    seed.append(&seller.to_string().into());
    seed.append(&buyer.to_string().into());
    seed.append(&Bytes::from_slice(env, &secret_hash.to_array()));
    let seq = env.ledger().sequence();
    seed.append(&Bytes::from_slice(env, &seq.to_be_bytes()));
    env.crypto().sha256(&seed)
}

#[contract]
pub struct EscrowFactory;

#[contractimpl]
impl EscrowFactory {
    /// Initialize the contract with admin, token address, and platform wallet.
    /// Called once after deployment.
    pub fn initialize(
        env: Env,
        admin: Address,
        token_id: Address,
        platform_wallet: Address,
    ) -> Result<(), EscrowError> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(EscrowError::AlreadyInitialized);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenId, &token_id);
        env.storage().instance().set(&DataKey::PlatformWallet, &platform_wallet);
        Ok(())
    }

    /// Lock funds in escrow. Called by the SELLER.
    /// Returns trade_id (32-byte hash).
    pub fn lock(
        env: Env,
        seller: Address,
        buyer: Address,
        amount: i128,
        platform_fee: i128,
        secret_hash: BytesN<32>,
        timeout_minutes: u32,
    ) -> Result<BytesN<32>, EscrowError> {
        // Require seller authorization
        seller.require_auth();

        if amount <= 0 || platform_fee < 0 {
            return Err(EscrowError::InsufficientAmount);
        }

        let token_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenId)
            .ok_or(EscrowError::NotInitialized)?;

        // Transfer total (amount + platform_fee) from seller to this contract
        let total = amount + platform_fee;
        let token_client = token::Client::new(&env, &token_id);
        token_client.transfer(&seller, &env.current_contract_address(), &total);

        // Compute trade_id
        let trade_id = compute_trade_id(&env, &seller, &buyer, &secret_hash);

        // Calculate timeout as absolute ledger number
        // ~12 ledgers per minute (5s per ledger)
        let timeout_ledger = env.ledger().sequence() + (timeout_minutes * 12);

        let trade = TradeEscrow {
            seller: seller.clone(),
            buyer: buyer.clone(),
            amount,
            platform_fee,
            secret_hash,
            timeout_ledger,
            status: TradeStatus::Locked,
        };

        env.storage().persistent().set(&DataKey::Trade(trade_id.clone()), &trade);

        // Emit event
        env.events().publish(
            (symbol_short!("locked"),),
            (trade_id.clone(), seller, buyer, amount, timeout_ledger),
        );

        log!(&env, "Trade locked: amount={}, timeout_ledger={}", amount, timeout_ledger);

        Ok(trade_id)
    }

    /// Release funds to buyer by presenting the secret (preimage).
    /// Called by the BUYER.
    pub fn release(
        env: Env,
        trade_id: BytesN<32>,
        secret: Bytes,
    ) -> Result<(), EscrowError> {
        let mut trade: TradeEscrow = env
            .storage()
            .persistent()
            .get(&DataKey::Trade(trade_id.clone()))
            .ok_or(EscrowError::TradeNotFound)?;

        if trade.status != TradeStatus::Locked {
            return Err(EscrowError::TradeNotLocked);
        }

        // Check timeout hasn't been reached (can still release)
        // Note: we allow release even after timeout — the important thing
        // is that refund becomes available after timeout.

        // Verify secret: sha256(secret) must equal secret_hash
        let computed_hash = env.crypto().sha256(&secret);
        if computed_hash != trade.secret_hash {
            return Err(EscrowError::InvalidSecret);
        }

        // Require buyer authorization
        trade.buyer.require_auth();

        let token_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenId)
            .ok_or(EscrowError::NotInitialized)?;

        let platform_wallet: Address = env
            .storage()
            .instance()
            .get(&DataKey::PlatformWallet)
            .ok_or(EscrowError::NotInitialized)?;

        let token_client = token::Client::new(&env, &token_id);

        // Transfer amount to buyer
        token_client.transfer(
            &env.current_contract_address(),
            &trade.buyer,
            &trade.amount,
        );

        // Transfer platform fee to platform wallet
        if trade.platform_fee > 0 {
            token_client.transfer(
                &env.current_contract_address(),
                &platform_wallet,
                &trade.platform_fee,
            );
        }

        // Update status
        trade.status = TradeStatus::Released;
        env.storage().persistent().set(&DataKey::Trade(trade_id.clone()), &trade);

        env.events().publish(
            (symbol_short!("released"),),
            (trade_id, trade.seller, trade.buyer),
        );

        Ok(())
    }

    /// Refund seller after timeout. Can be called by anyone.
    pub fn refund(
        env: Env,
        trade_id: BytesN<32>,
    ) -> Result<(), EscrowError> {
        let mut trade: TradeEscrow = env
            .storage()
            .persistent()
            .get(&DataKey::Trade(trade_id.clone()))
            .ok_or(EscrowError::TradeNotFound)?;

        if trade.status != TradeStatus::Locked {
            return Err(EscrowError::TradeNotLocked);
        }

        // Check that timeout HAS been reached
        if env.ledger().sequence() < trade.timeout_ledger {
            return Err(EscrowError::TimeoutNotReached);
        }

        let token_id: Address = env
            .storage()
            .instance()
            .get(&DataKey::TokenId)
            .ok_or(EscrowError::NotInitialized)?;

        let token_client = token::Client::new(&env, &token_id);

        // Refund total (amount + platform_fee) to seller
        let total = trade.amount + trade.platform_fee;
        token_client.transfer(
            &env.current_contract_address(),
            &trade.seller,
            &total,
        );

        trade.status = TradeStatus::Refunded;
        env.storage().persistent().set(&DataKey::Trade(trade_id.clone()), &trade);

        env.events().publish(
            (symbol_short!("refunded"),),
            (trade_id, trade.seller.clone()),
        );

        Ok(())
    }

    /// Read trade state (view function, no state mutation).
    pub fn get_trade(
        env: Env,
        trade_id: BytesN<32>,
    ) -> Result<TradeEscrow, EscrowError> {
        env.storage()
            .persistent()
            .get(&DataKey::Trade(trade_id))
            .ok_or(EscrowError::TradeNotFound)
    }
}

// symbol_short! helper for event topics
use soroban_sdk::symbol_short;

#[cfg(test)]
mod test;
```

### `contracts/escrow/src/test.rs`

```rust
#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    token, Address, Bytes, BytesN, Env,
};

fn create_token_contract(env: &Env, admin: &Address) -> (token::Client, token::StellarAssetClient, Address) {
    let addr = env.register_stellar_asset_contract_v2(admin.clone());
    let client = token::Client::new(env, &addr.address());
    let admin_client = token::StellarAssetClient::new(env, &addr.address());
    (client, admin_client, addr.address())
}

fn setup_env() -> (
    Env,
    Address,           // contract_id
    Address,           // admin
    Address,           // seller
    Address,           // buyer
    Address,           // platform_wallet
    Address,           // token_id
    token::Client,     // token_client
    token::StellarAssetClient, // token_admin_client
) {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let seller = Address::generate(&env);
    let buyer = Address::generate(&env);
    let platform_wallet = Address::generate(&env);

    let (token_client, token_admin_client, token_id) = create_token_contract(&env, &admin);

    // Register the escrow contract
    let contract_id = env.register_contract(None, EscrowFactory);

    // Initialize
    let escrow = EscrowFactoryClient::new(&env, &contract_id);
    escrow.initialize(&admin, &token_id, &platform_wallet);

    // Mint tokens to seller
    token_admin_client.mint(&seller, &100_000_000_000); // 10,000 MXNe (7 decimals)

    (env, contract_id, admin, seller, buyer, platform_wallet, token_id, token_client, token_admin_client)
}

fn make_secret(env: &Env) -> (Bytes, BytesN<32>) {
    let secret = Bytes::from_slice(env, b"test_secret_32_bytes_long_pad__!!");
    let hash = env.crypto().sha256(&secret);
    (secret, hash)
}

#[test]
fn test_lock_and_release() {
    let (env, contract_id, _, seller, buyer, platform_wallet, _, token_client, _) = setup_env();
    let escrow = EscrowFactoryClient::new(&env, &contract_id);

    let (secret, secret_hash) = make_secret(&env);
    let amount: i128 = 1_500_000_000; // 150 MXNe
    let platform_fee: i128 = 12_000_000; // 1.2 MXNe

    let seller_balance_before = token_client.balance(&seller);

    // Lock
    let trade_id = escrow.lock(
        &seller,
        &buyer,
        &amount,
        &platform_fee,
        &secret_hash,
        &30, // 30 minutes timeout
    );

    // Verify seller balance decreased
    assert_eq!(
        token_client.balance(&seller),
        seller_balance_before - amount - platform_fee
    );

    // Verify trade state
    let trade = escrow.get_trade(&trade_id);
    assert_eq!(trade.status, TradeStatus::Locked);
    assert_eq!(trade.amount, amount);
    assert_eq!(trade.seller, seller);
    assert_eq!(trade.buyer, buyer);

    // Release with correct secret
    escrow.release(&trade_id, &secret);

    // Verify buyer received funds
    assert_eq!(token_client.balance(&buyer), amount);

    // Verify platform received fee
    assert_eq!(token_client.balance(&platform_wallet), platform_fee);

    // Verify trade completed
    let trade_after = escrow.get_trade(&trade_id);
    assert_eq!(trade_after.status, TradeStatus::Released);
}

#[test]
fn test_refund_after_timeout() {
    let (env, contract_id, _, seller, buyer, _, _, token_client, _) = setup_env();
    let escrow = EscrowFactoryClient::new(&env, &contract_id);

    let (_, secret_hash) = make_secret(&env);
    let amount: i128 = 1_500_000_000;
    let platform_fee: i128 = 12_000_000;

    let seller_balance_before = token_client.balance(&seller);

    let trade_id = escrow.lock(
        &seller, &buyer, &amount, &platform_fee, &secret_hash, &1, // 1 minute timeout
    );

    // Advance ledger past timeout (1 minute = ~12 ledgers)
    env.ledger().set(LedgerInfo {
        timestamp: env.ledger().timestamp() + 120,
        sequence_number: env.ledger().sequence() + 20, // past 12 ledgers
        ..env.ledger().get()
    });

    // Refund
    escrow.refund(&trade_id);

    // Seller gets everything back
    assert_eq!(token_client.balance(&seller), seller_balance_before);

    let trade = escrow.get_trade(&trade_id);
    assert_eq!(trade.status, TradeStatus::Refunded);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")] // InvalidSecret
fn test_release_wrong_secret() {
    let (env, contract_id, _, seller, buyer, _, _, _, _) = setup_env();
    let escrow = EscrowFactoryClient::new(&env, &contract_id);

    let (_, secret_hash) = make_secret(&env);
    let trade_id = escrow.lock(
        &seller, &buyer, &1_000_000_000, &0, &secret_hash, &30,
    );

    let wrong_secret = Bytes::from_slice(&env, b"wrong_secret_not_matching_hash!!");
    escrow.release(&trade_id, &wrong_secret);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")] // TimeoutNotReached
fn test_refund_before_timeout() {
    let (env, contract_id, _, seller, buyer, _, _, _, _) = setup_env();
    let escrow = EscrowFactoryClient::new(&env, &contract_id);

    let (_, secret_hash) = make_secret(&env);
    let trade_id = escrow.lock(
        &seller, &buyer, &1_000_000_000, &0, &secret_hash, &30,
    );

    // Try refund before timeout — should fail
    escrow.refund(&trade_id);
}

#[test]
fn test_double_initialize_fails() {
    let (env, contract_id, admin, _, _, platform_wallet, token_id, _, _) = setup_env();
    let escrow = EscrowFactoryClient::new(&env, &contract_id);

    // Second initialize should fail
    let result = escrow.try_initialize(&admin, &token_id, &platform_wallet);
    assert!(result.is_err());
}
```

---

## 4. Esquema de Base de Datos — SQL Listo para Ejecutar

### `sql/init.sql`

```sql
-- Micopay MVP — Schema simplificado
-- Solo las tablas necesarias para el flujo del trade

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================
-- USERS
-- ================================================
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stellar_address VARCHAR(56) UNIQUE NOT NULL,
  username        VARCHAR(30) UNIQUE NOT NULL,
  phone_hash      VARCHAR(64) UNIQUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_stellar ON users (stellar_address);

-- ================================================
-- WALLETS
-- ================================================
CREATE TABLE wallets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id),
  stellar_address VARCHAR(56) NOT NULL,
  wallet_type     VARCHAR(15) DEFAULT 'self_custodial',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TRADES
-- ================================================
CREATE TABLE trades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  seller_id       UUID NOT NULL REFERENCES users(id),
  buyer_id        UUID NOT NULL REFERENCES users(id),

  amount_mxn      INTEGER NOT NULL,
  amount_stroops  BIGINT NOT NULL,
  seller_fee_mxn  INTEGER NOT NULL DEFAULT 0,
  platform_fee_mxn INTEGER NOT NULL DEFAULT 0,

  -- HTLC
  secret_hash     VARCHAR(64) NOT NULL,
  secret_enc      BYTEA,
  secret_nonce    BYTEA,

  -- Estado
  status          VARCHAR(12) DEFAULT 'pending'
                  CHECK (status IN (
                    'pending', 'locked', 'revealing',
                    'completed', 'cancelled', 'refunded'
                  )),

  -- Stellar
  stellar_trade_id VARCHAR(64),
  lock_tx_hash    VARCHAR(64),
  release_tx_hash VARCHAR(64),

  -- Timestamps
  locked_at       TIMESTAMPTZ,
  reveal_requested_at TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trades_seller ON trades (seller_id, status);
CREATE INDEX idx_trades_buyer ON trades (buyer_id, status);
CREATE INDEX idx_trades_status ON trades (status, expires_at)
  WHERE status IN ('locked', 'revealing');

-- ================================================
-- SECRET ACCESS LOG
-- ================================================
CREATE TABLE secret_access_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id        UUID NOT NULL REFERENCES trades(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  ip_address      INET NOT NULL,
  user_agent      TEXT,
  accessed_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_secret_access_trade ON secret_access_log (trade_id);
```

---

## 5. Endpoints del Backend — Especificación Completa

### Orden de implementación

#### 1. Auth (prerequisite for everything)

| Method | Path | Descripción | Request | Response |
|---|---|---|---|---|
| `POST` | `/auth/challenge` | Generar challenge para SEP-10 simplificado | `{ stellar_address }` | `{ challenge, expires_at }` |
| `POST` | `/auth/token` | Verificar firma y emitir JWT | `{ stellar_address, challenge, signature }` | `{ token, user }` |

#### 2. Users

| Method | Path | Descripción | Request | Response |
|---|---|---|---|---|
| `POST` | `/users/register` | Crear usuario + wallet | `{ stellar_address, username }` | `{ user, token }` |
| `GET` | `/users/me` | Perfil propio (requiere JWT) | — | `{ user }` |

#### 3. Trades (el corazón del MVP)

| Method | Path | Descripción | Auth | Request | Response |
|---|---|---|---|---|---|
| `POST` | `/trades` | Crear trade (comprador inicia) | JWT (buyer) | `{ seller_id, amount_mxn }` | `{ trade }` con `secret_hash` |
| `GET` | `/trades/:id` | Detalle del trade | JWT (seller o buyer) | — | `{ trade }` |
| `GET` | `/trades/active` | Trades activos del usuario | JWT | — | `{ trades[] }` |
| `POST` | `/trades/:id/lock` | Vendedor confirma lock on-chain | JWT (seller) | `{ stellar_trade_id, lock_tx_hash }` | `{ status: "locked" }` |
| `POST` | `/trades/:id/reveal` | Vendedor confirmó recibir efectivo | JWT (seller) | — | `{ status: "revealing" }` |
| `GET` | `/trades/:id/secret` | Vendedor obtiene secreto para QR | JWT (seller) | — | `{ secret, qr_payload }` |
| `POST` | `/trades/:id/complete` | Comprador confirma release on-chain | JWT (buyer) | `{ release_tx_hash }` | `{ status: "completed" }` |
| `POST` | `/trades/:id/cancel` | Cancelar trade (antes de lock) | JWT (seller o buyer) | — | `{ status: "cancelled" }` |

#### 4. Stellar relay

| Method | Path | Descripción | Request | Response |
|---|---|---|---|---|
| `POST` | `/stellar/submit` | Relay de tx firmada | `{ xdr }` | `{ hash, status }` |

#### 5. Health

| Method | Path | Descripción |
|---|---|---|
| `GET` | `/health` | Healthcheck |

---

## 6. Flujo del Secreto HTLC — Orden Exacto de Operaciones

```
PASO 1: CREAR TRADE (POST /trades)
├── server: { secret, secretHash } = generateTradeSecret()
│   ├── secret = randomBytes(32).toString('hex')     → 64 chars
│   └── secretHash = sha256(secretBytes).toString('hex') → 64 chars
├── server: Opción A — cifrar y guardar inmediatamente
│   ├── { encrypted, nonce } = encryptSecret(secret)
│   └── INSERT trades SET secret_hash, secret_enc, secret_nonce
├── response: devolver secret_hash al comprador

PASO 2: LOCK ON-CHAIN (seller construye tx)
├── seller: leer secret_hash del trade detail
├── seller: buildLockTransaction(seller, buyer, amount, fee, secretHash, timeout)
│   └── contract.call('lock', ..., secretHash_as_BytesN32, ...)
├── seller: firmar XDR → submit a Stellar
├── seller: POST /trades/:id/lock { stellar_trade_id, lock_tx_hash }
├── server: verifyLockOnChain(stellar_trade_id, seller, amount) ← mock en MVP
├── server: UPDATE trades SET status='locked', locked_at=NOW()

PASO 3: CONFIRMAR EFECTIVO (POST /trades/:id/reveal)
├── seller: confirma que recibió el efectivo del comprador
├── server: UPDATE trades SET status='revealing', reveal_requested_at=NOW()

PASO 4: OBTENER SECRETO (GET /trades/:id/secret)
├── seller: solicita el secreto
├── server: validateSecretAccess(tradeId, userId)
│   ├── ¿es el seller? ✓
│   ├── ¿trade en estado 'revealing'? ✓
│   └── ¿no expirado? ✓
├── server: decryptSecret(trade.secret_enc, trade.secret_nonce) → secret
├── server: INSERT secret_access_log
├── response: { secret, qr_payload: "micopay://release?trade_id=X&secret=Y" }

PASO 5: ESCANEAR QR Y RELEASE (buyer)
├── buyer: escanea QR → extrae secret
├── buyer: buildReleaseTransaction(tradeId, secret)
│   └── contract.call('release', tradeId, secret_as_Bytes)
├── buyer: firmar XDR → submit a Stellar
├── buyer: POST /trades/:id/complete { release_tx_hash }
├── server: UPDATE trades SET status='completed', completed_at=NOW()
├── server: DELETE secret_enc, secret_nonce de la DB
```

### Funciones de cifrado/descifrado

```typescript
// secret.service.ts

import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';

const ENCRYPTION_KEY = Buffer.from(process.env.SECRET_ENCRYPTION_KEY!, 'hex');
// Must be 32 bytes (64 hex chars). Generate: openssl rand -hex 32

export function generateTradeSecret(): { secret: string; secretHash: string } {
  const secretBytes = randomBytes(32);
  const secret = secretBytes.toString('hex');
  const secretHash = createHash('sha256').update(secretBytes).digest('hex');
  return { secret, secretHash };
}

export function encryptSecret(secret: string): { encrypted: Buffer; nonce: Buffer } {
  const nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, nonce);
  const encrypted = Buffer.concat([
    cipher.update(secret, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(), // 16 bytes
  ]);
  return { encrypted, nonce };
}

export function decryptSecret(encrypted: Buffer, nonce: Buffer): string {
  const authTag = encrypted.slice(-16);
  const ciphertext = encrypted.slice(0, -16);
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, nonce);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
}
```

---

## 7. Secuencia de Implementación — Paso a Paso

> Cada paso es autónomo — al terminar, se puede verificar antes de continuar.

### Fase 0: Setup del proyecto (15 min) ✅ COMPLETA

1. ✅ Crear estructura de directorios
2. ✅ Inicializar el contrato Rust: `cargo init --lib`
3. ✅ Inicializar el backend: `npm init` + instalar dependencias (`npm install` ejecutado, `pino-pretty` agregado)
4. ✅ Crear `.env` con valores de testnet (PostgreSQL apuntando a Docker)
5. ✅ Crear `sql/init.sql` y ejecutar contra PG local (Docker en `localhost:5432`)

### Fase 1: Smart Contract (45 min) ✅ CÓDIGO COMPLETO — ⏳ Compilación/Deploy pendiente

6. ✅ Escribir `errors.rs` y `types.rs`
7. ✅ Escribir `lib.rs` (EscrowFactory con lock, release, refund, get_trade, initialize) — **+ TTL extension y require_auth ordering corregidos**
8. ✅ Escribir `test.rs` con 5 tests
9. ⏳ Compilar: `cargo build --target wasm32-unknown-unknown --release` — *requiere Rust toolchain*
10. ⏳ Ejecutar tests: `cargo test` — *requiere Rust toolchain*
11. ⏳ Deploy a testnet: `stellar contract deploy` — *requiere Rust + stellar-cli*

### Fase 2: Backend Core (30 min) ✅ COMPLETA

12. ✅ `src/config.ts` — lectura y validación de env vars
13. ✅ `src/utils/errors.ts` — custom errors
14. ✅ `src/db/schema.ts` — esquema con pg Pool (sin Drizzle, raw SQL)
15. ✅ `src/index.ts` — inicialización Fastify con plugins (JWT, rate-limit)
16. ✅ `src/middleware/auth.middleware.ts` — verificación JWT

### Fase 3: Servicios (30 min) ✅ COMPLETA

17. ✅ `src/services/secret.service.ts` — generación, cifrado, descifrado
18. ✅ `src/services/stellar.service.ts` — interacción con Soroban (mock toggle) — **patrón rpc.Server corregido**
19. ✅ `src/services/trade.service.ts` — lógica de negocio del trade

### Fase 4: Rutas (45 min) ✅ COMPLETA

20. ✅ `src/routes/auth.ts` — challenge + token
21. ✅ `src/routes/users.ts` — register + me
22. ✅ `src/routes/trades.ts` — el CRUD completo del trade
23. ✅ `src/routes/stellar.ts` — submit relay

### Fase 5: Script E2E (20 min) ✅ COMPLETA

24. ✅ `scripts/e2e-test.ts` — simula el flujo completo (11 pasos)
25. ✅ Verificar el flujo end-to-end — **todos los pasos pasan**

**Tiempo total estimado: ~3 horas de implementación pura.**

---

## 8. Comandos de Setup

### Prerrequisitos

```bash
# Rust + Soroban
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
rustup target add wasm32-unknown-unknown
cargo install --locked stellar-cli --features opt

# Node.js 20+
# Asumir ya instalado

# PostgreSQL 15+
# Asumir ya instalado y corriendo en localhost:5432
```

### Setup del contrato

```bash
# Crear identidades de testnet
stellar keys generate --global admin --network testnet --fund
stellar keys generate --global seller --network testnet --fund
stellar keys generate --global buyer --network testnet --fund

# Compilar contrato
cd contracts/escrow
cargo build --target wasm32-unknown-unknown --release

# Deploy del contrato a testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/micopay_escrow.wasm \
  --source admin \
  --network testnet
# Anotar el CONTRACT_ID devuelto → va en .env como ESCROW_CONTRACT_ID

# Crear un token de prueba (simula MXNe SAC)
stellar contract asset deploy \
  --asset MXNe:$(stellar keys address admin) \
  --source admin \
  --network testnet
# Anotar el token contract ID → va en .env como MXNE_CONTRACT_ID

# Inicializar el contrato
stellar contract invoke \
  --id $ESCROW_CONTRACT_ID \
  --source admin \
  --network testnet \
  -- \
  initialize \
  --admin $(stellar keys address admin) \
  --token_id $MXNE_CONTRACT_ID \
  --platform_wallet $(stellar keys address admin)

# Mint tokens al seller para pruebas
stellar contract invoke \
  --id $MXNE_CONTRACT_ID \
  --source admin \
  --network testnet \
  -- \
  mint \
  --to $(stellar keys address seller) \
  --amount 100000000000
```

### Setup del backend

```bash
cd backend

# Instalar dependencias
npm install

# Crear base de datos
createdb micopay_dev
psql micopay_dev < ../sql/init.sql

# Copiar y ajustar env
cp .env.example .env
# Editar .env con los valores reales (CONTRACT_IDs, keys, DB URL)

# Iniciar en desarrollo
npm run dev
```

### `.env.example`

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/micopay_dev

# Stellar Testnet
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK=TESTNET
PLATFORM_SECRET_KEY=S...
ESCROW_CONTRACT_ID=C...
MXNE_CONTRACT_ID=C...
MXNE_ISSUER_ADDRESS=G...

# HTLC Secret Encryption
SECRET_ENCRYPTION_KEY=  # openssl rand -hex 32

# JWT
JWT_SECRET=dev_jwt_secret_change_in_production
JWT_EXPIRY=24h

# MVP flags
MOCK_STELLAR=true  # true = no verifica on-chain, simula respuestas
PORT=3000
```

---

## 9. Script de Prueba End-to-End

### `scripts/e2e-test.ts`

```typescript
/**
 * Micopay MVP — E2E Test Script
 * 
 * Simula el flujo completo:
 * 1. Registrar seller y buyer
 * 2. Buyer crea trade → recibe secret_hash
 * 3. Seller confirma lock on-chain
 * 4. Seller confirma recibir efectivo (reveal)
 * 5. Seller obtiene secreto → genera QR
 * 6. Buyer "escanea QR" → completa trade
 * 
 * Uso: npx tsx scripts/e2e-test.ts
 */

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function api(method: string, path: string, body?: any, token?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  console.log('🍄 Micopay E2E Test\n');

  // --- Step 1: Register users ---
  console.log('1️⃣  Registering seller...');
  const seller = await api('POST', '/users/register', {
    stellar_address: 'GBSELLER' + 'X'.repeat(56 - 8), // mock address
    username: 'vendedor_e2e',
  });
  console.log(`   ✅ Seller: ${seller.user.id}`);

  console.log('   Registering buyer...');
  const buyer = await api('POST', '/users/register', {
    stellar_address: 'GBBUYER' + 'Y'.repeat(56 - 7), // mock address
    username: 'comprador_e2e',
  });
  console.log(`   ✅ Buyer: ${buyer.user.id}`);

  // --- Step 2: Buyer creates trade ---
  console.log('\n2️⃣  Buyer creates trade...');
  const trade = await api('POST', '/trades', {
    seller_id: seller.user.id,
    amount_mxn: 1500,
  }, buyer.token);
  const tradeId = trade.trade.id;
  console.log(`   ✅ Trade created: ${tradeId}`);
  console.log(`   📋 Secret hash: ${trade.trade.secret_hash}`);
  console.log(`   📋 Status: ${trade.trade.status}`);

  // --- Step 3: Seller locks on-chain ---
  console.log('\n3️⃣  Seller locks funds on-chain...');
  const lockResult = await api('POST', `/trades/${tradeId}/lock`, {
    stellar_trade_id: 'mock_stellar_trade_id_' + Date.now(),
    lock_tx_hash: 'mock_tx_hash_' + Date.now(),
  }, seller.token);
  console.log(`   ✅ Status: ${lockResult.status}`);

  // --- Step 4: Verify trade detail ---
  console.log('\n4️⃣  Checking trade detail...');
  const detail = await api('GET', `/trades/${tradeId}`, undefined, seller.token);
  console.log(`   📋 Status: ${detail.trade.status}`);
  console.log(`   📋 Locked at: ${detail.trade.locked_at}`);

  // --- Step 5: Seller reveals (confirms cash received) ---
  console.log('\n5️⃣  Seller confirms cash received (reveal)...');
  const revealResult = await api('POST', `/trades/${tradeId}/reveal`, undefined, seller.token);
  console.log(`   ✅ Status: ${revealResult.status}`);

  // --- Step 6: Seller gets secret for QR ---
  console.log('\n6️⃣  Seller gets secret (QR payload)...');
  const secretResult = await api('GET', `/trades/${tradeId}/secret`, undefined, seller.token);
  console.log(`   🔐 Secret: ${secretResult.secret.substring(0, 16)}...`);
  console.log(`   📱 QR payload: ${secretResult.qr_payload}`);

  // --- Step 7: Buyer "scans QR" and completes ---
  console.log('\n7️⃣  Buyer scans QR → completes trade...');
  const completeResult = await api('POST', `/trades/${tradeId}/complete`, {
    release_tx_hash: 'mock_release_tx_' + Date.now(),
  }, buyer.token);
  console.log(`   ✅ Status: ${completeResult.status}`);

  // --- Step 8: Final verification ---
  console.log('\n8️⃣  Final trade state...');
  const finalTrade = await api('GET', `/trades/${tradeId}`, undefined, seller.token);
  console.log(`   📋 Final status: ${finalTrade.trade.status}`);
  console.log(`   📋 Completed at: ${finalTrade.trade.completed_at}`);

  console.log('\n🍄 ¡E2E test completado exitosamente! 🎉\n');
}

main().catch((err) => {
  console.error('\n❌ E2E test failed:', err.message);
  process.exit(1);
});
```

---

## Verification Plan

### Automated Tests

1. **Contrato Soroban (Rust tests):** ⏳ Pendiente
   ```bash
   cd contracts/escrow
   cargo test
   ```
   Tests cubren: lock+release happy path, refund after timeout, wrong secret rejection, premature refund rejection, double-initialize rejection.
   > *Requiere Rust toolchain instalado. Código de tests completo en `test.rs`.*

2. **Backend (script E2E):** ✅ EJECUTADO — todos los 11 pasos pasan
   ```bash
   # Con el server corriendo y MOCK_STELLAR=true
   cd backend && npm run dev &
   npx tsx scripts/e2e-test.ts
   ```
   Verifica el flujo completo: health → register → create trade → lock → reveal → get secret → buyer blocked → complete → cancel → list active.

3. **Secret service (unit test):** ✅ Verificado indirectamente vía E2E
   ```bash
   npx tsx -e "
   const { generateTradeSecret, encryptSecret, decryptSecret } = require('./src/services/secret.service');
   const { secret, secretHash } = generateTradeSecret();
   const { encrypted, nonce } = encryptSecret(secret);
   const recovered = decryptSecret(encrypted, nonce);
   console.assert(recovered === secret, 'Secret roundtrip failed!');
   console.log('✅ Secret service roundtrip OK');
   "
   ```

### Manual Verification

1. ✅ **Backend corriendo** en `http://localhost:3000` (`GET /health` responde OK)
2. ✅ **PostgreSQL en Docker** — tablas creadas, registros verificados vía E2E
3. ⏳ **Deploy a testnet** — pendiente tras compilación del contrato

---

## User Review Required

> [!IMPORTANT]
> **PostgreSQL**: ✅ Resuelto — corriendo en Docker (`docker run postgres:15-alpine`). `DATABASE_URL` actualizado en `.env`.

> [!IMPORTANT]
> **Soroban Testnet**: ⏳ Pendiente — se necesita instalar Rust + `stellar-cli` y compilar el contrato WASM para hacer deploy.

> [!WARNING]
> **MOCK_STELLAR=true**: actualmente activo. El backend pasa el E2E completo en modo mock. Para activar verificación real: instalar Rust, deployar el contrato, actualizar `ESCROW_CONTRACT_ID` en `.env` y cambiar `MOCK_STELLAR=false`.

> [!NOTE]
> **Omisiones deliberadas del MVP**: no hay offers/mapa, no hay chat, no hay jobs async. El trade se inicia directamente con un `seller_id`. ✅ Confirmado correcto para la demo.

---

## Fixes aplicados (stellar-dev skill review)

| Fix | Archivo | Severidad |
|---|---|---|
| TTL extension en persistent storage — trades no se archivan en testnet | `contracts/escrow/src/lib.rs` | 🔴 Crítico |
| `require_auth()` movido antes del secret check en `release()` | `contracts/escrow/src/lib.rs` | 🔴 Crítico |
| `SorobanRpc.Server` → `rpc.Server` (patrón actual del SDK) | `backend/src/services/stellar.service.ts` | 🟡 Importante |
| `Content-Type: application/json` solo cuando hay body en E2E | `scripts/e2e-test.ts` | 🟡 Bug |
| `secret_cleared` check corregido (undefined vs null) | `scripts/e2e-test.ts` | 🟡 Bug |
| `pino-pretty` agregado a `package.json` devDependencies | `backend/package.json` | 🟢 Setup |
