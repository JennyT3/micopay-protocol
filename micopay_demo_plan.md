# Micopay — Plan para Demo Funcional Real

## Paso 1: Instalar Rust + compilar contrato + `cargo test`

### 1.1 Instalar Rust (si no está instalado)
```powershell
# Descargar e instalar rustup (aceptar defaults)
winget install Rustlang.Rustup
# O bien: https://rustup.rs → descargar rustup-init.exe

# Agregar target WASM
rustup target add wasm32-unknown-unknown

# Instalar Stellar CLI
cargo install --locked stellar-cli --features opt
```

### 1.2 Actualizar SDK a versión actual

> [!WARNING]
> El `Cargo.toml` actual usa `soroban-sdk = "21.7.6"`. La versión recomendada por el Stellar Skill es `25.0.1`. Hay que decidir:
> - **Opción A (segura):** quedarse en `21.7.6` — evita breaking changes a última hora.
> - **Opción B (correcta):** subir a `25.0.1` — puede requerir ajustes menores en las APIs (e.g. `env.register()` vs `env.register_contract()`).
>
> **Recomendación:** intentar con `25.0.1` primero. Si falla la compilación, bajar a `21.7.6`.

```diff
# Cargo.toml
-soroban-sdk = "21.7.6"
-soroban-token-sdk = "21.7.6"
+soroban-sdk = "25.0.1"
+soroban-token-sdk = "25.0.1"

# dev-dependencies
-soroban-sdk = { version = "21.7.6", features = ["testutils"] }
+soroban-sdk = { version = "25.0.1", features = ["testutils"] }
```

### 1.3 Compilar y testear
```powershell
cd micopay\contracts\escrow

# Build (debe generar el .wasm)
stellar contract build
# Alternativa: cargo build --target wasm32-unknown-unknown --release

# Tests unitarios (5 tests)
cargo test
```

**Criterio de éxito:** los 5 tests pasan y existe `target/wasm32-unknown-unknown/release/micopay_escrow.wasm`.

---

## Paso 2: Deploy a testnet → obtener IDs reales

### 2.1 Generar identidades y fondear con Friendbot
```bash
stellar keys generate --global micopay-admin --network testnet --fund
stellar keys generate --global test-seller --network testnet --fund
stellar keys generate --global test-buyer --network testnet --fund

# Anotar las direcciones
stellar keys address micopay-admin
stellar keys address test-seller
stellar keys address test-buyer
```

### 2.2 Deploy del contrato EscrowFactory
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/micopay_escrow.wasm \
  --source micopay-admin \
  --network testnet
```
**Output:** `CXXXXXX...` → este es el `ESCROW_CONTRACT_ID`.

### 2.3 Deploy de un token de prueba (simula MXNe SAC)
```bash
stellar contract asset deploy \
  --asset MXNe:$(stellar keys address micopay-admin) \
  --source micopay-admin \
  --network testnet
```
**Output:** `CXXXXXX...` → este es el `MXNE_CONTRACT_ID`.

### 2.4 Inicializar el contrato
```bash
stellar contract invoke \
  --id $ESCROW_CONTRACT_ID \
  --source micopay-admin \
  --network testnet \
  -- \
  initialize \
  --admin $(stellar keys address micopay-admin) \
  --token_id $MXNE_CONTRACT_ID \
  --platform_wallet $(stellar keys address micopay-admin)
```

### 2.5 Mint tokens al seller para pruebas
```bash
stellar contract invoke \
  --id $MXNE_CONTRACT_ID \
  --source micopay-admin \
  --network testnet \
  -- \
  mint \
  --to $(stellar keys address test-seller) \
  --amount 100000000000
```

**Criterio de éxito:** `stellar contract invoke --id $ESCROW_CONTRACT_ID ... -- get_trade` funciona sin error (aunque no haya trades aún).

---

## Paso 3: Agregar `@fastify/cors` al backend

```bash
cd micopay\backend
npm install @fastify/cors
```

Agregar en `src/index.ts`, después del JWT plugin:

```typescript
import cors from '@fastify/cors';

app.register(cors, {
  origin: true,          // permite cualquier origen en dev
  credentials: true,
});
```

---

## Paso 4: Actualizar `.env` con IDs reales

```bash
# .env — actualizar con los valores obtenidos en Paso 2
STELLAR_RPC_URL=https://soroban-testnet.stellar.org
STELLAR_NETWORK=TESTNET
PLATFORM_SECRET_KEY=S...   # stellar keys show micopay-admin (secret key)
ESCROW_CONTRACT_ID=C...    # del paso 2.2
MXNE_CONTRACT_ID=C...      # del paso 2.3
MXNE_ISSUER_ADDRESS=G...   # stellar keys address micopay-admin

# Cambiar mock a false
MOCK_STELLAR=false
```

> [!IMPORTANT]
> Para obtener la secret key: `stellar keys show micopay-admin` (puede pedir confirmación).

---

## Secuencia de ejecución

| # | Qué | Tiempo est. | Bloqueante |
|---|---|---|---|
| 1.1 | Instalar Rust + wasm target + stellar-cli | 5-10 min | Descarga |
| 1.2 | Actualizar Cargo.toml (SDK version) | 1 min | — |
| 1.3 | `stellar contract build` + `cargo test` | 3-5 min | Compilación |
| 2.1 | Generar identidades testnet | 1 min | — |
| 2.2 | Deploy contrato | 1 min | — |
| 2.3 | Deploy token MXNe | 1 min | — |
| 2.4 | Inicializar contrato | 1 min | — |
| 2.5 | Mint tokens | 1 min | — |
| 3 | `npm install @fastify/cors` + editar index.ts | 2 min | — |
| 4 | Actualizar `.env` con IDs reales | 2 min | — |
| **Total** | | **~20 min** | |

---

## Verificación final

```bash
# 1. Backend corriendo con MOCK_STELLAR=false
cd backend && npm run dev

# 2. E2E test
# NOTA: el E2E actual usa mock addresses. Para probar con Stellar real,
# necesitarás registrar usuarios con las direcciones reales de testnet
# (test-seller, test-buyer) y que el lock/release realmente invoquen
# el contrato. Eso requiere que el frontend o el script construya XDRs
# firmados reales — esto es un paso siguiente al backend.
```
