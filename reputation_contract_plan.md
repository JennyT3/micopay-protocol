# Prompt para Claude — Implementar ReputationRegistry (Soroban/Rust)

## Contexto

Estamos construyendo **Micopay**, una plataforma P2P de intercambio cripto↔efectivo sobre Stellar/Soroban. Ya tenemos implementado el contrato `EscrowFactory` (HTLC escrow) y el backend en Fastify/TypeScript.

**Repositorio**: https://github.com/ericmt-98/micopay-mvp

El contrato EscrowFactory existente está en `micopay/contracts/escrow/` y ya funciona con tests.

## Objetivo

Implementar el contrato **ReputationRegistry** en Soroban (Rust). Este contrato vive on-chain y registra la reputación de los usuarios de forma transparente e inmutable.

## Spec del Contrato (de micopay_backend_v1.3.md, sección 7.2)

### Funciones Públicas

```rust
// Registrar evento de reputación — solo EscrowFactory puede llamar
fn record_event(
    env: Env,
    user: Address,
    event_type: Symbol,    // 'trade_ok' | 'no_show' | 'dispute_lost' | 'dispute_won' | 'rating_5' | 'weekly_active'
    trade_id: BytesN<32>
)

// Obtener score actual de un usuario
fn get_score(env: Env, user: Address) -> i128

// Obtener nivel actual
fn get_level(env: Env, user: Address) -> Symbol

// Suspender usuario — solo admin
fn suspend(env: Env, user: Address, until: u64)
```

### Sistema de Niveles (Temática de Hongos 🍄)

| Nivel | Nombre | Score Requerido | Beneficios |
|---|---|---|---|
| 0 | `espora` | 0 | Límite de $5,000 MXN, fee 0.8% |
| 1 | `micelio` | 100 | Límite de $15,000 MXN, fee 0.6% |
| 2 | `hongo` | 500 | Límite de $30,000 MXN, fee 0.4% |
| 3 | `maestro` | 2000 | Límite de $50,000 MXN, fee 0.2% |

### Deltas de Reputación

| Evento | Delta | Notas |
|---|---|---|
| `trade_ok` (trade completado) | +10 | Base por completar un trade |
| `rating_5` (calificación 5 estrellas) | +5 | Bonus por excelente rating |
| `rating_4` | +2 | Buen rating |
| `rating_3` | 0 | Neutral |
| `rating_2` | -5 | Mal rating |
| `rating_1` | -10 | Pésimo rating |
| `no_show` (no se presentó) | -20 | Penalización por timeout |
| `dispute_lost` | -50 | Perdió una disputa |
| `dispute_won` | +15 | Ganó una disputa |
| `weekly_active` | +3 | Bonus semanal por actividad |

### Reglas de Negocio

1. **Solo EscrowFactory puede llamar a `record_event`** — Esto previene que usuarios manipulen su score.
2. **El score nunca baja de 0** — Clamped a 0 como mínimo.
3. **Usuarios suspendidos no pueden operar** — `suspend` establece un timestamp `until` después del cual se reactivan.
4. **El nivel se calcula automáticamente** basado en el score acumulado.
5. **Inmutabilidad** — Los eventos registrados son permanentes, no se pueden borrar.

## Almacenamiento On-Chain

```rust
#[contracttype]
pub enum DataKey {
    Admin,                          // Address del admin
    EscrowContract,                 // Address del EscrowFactory (única fuente autorizada)
    UserScore(Address),             // Score actual del usuario (Persistent)
    UserSuspendedUntil(Address),    // Timestamp de suspensión (Persistent)
    EventCount(Address),            // Número total de eventos del usuario (Persistent)
}
```

## Estructura del Proyecto

Crear en `micopay/contracts/reputation/`:
```
reputation/
├── Cargo.toml
└── src/
    ├── lib.rs          # Contrato principal
    ├── types.rs        # DataKey, enums
    ├── errors.rs       # Errores del contrato
    └── test.rs         # Tests unitarios
```

## Tests Requeridos

1. **test_record_trade_completed** — Registrar un trade completado y verificar que el score sube +10.
2. **test_level_progression** — Verificar que al llegar a 100 points el nivel cambia de `espora` a `micelio`.
3. **test_negative_event** — Verificar que `no_show` resta -20 pero el score no baja de 0.
4. **test_only_escrow_can_record** — Verificar que un address random no puede llamar a `record_event` (debe fallar).
5. **test_suspend_user** — Suspender un usuario y verificar que `get_level` refleja la suspensión.
6. **test_double_initialize_fails** — Prevenir re-inicialización.

## Dependencias

Usa las mismas versiones que el EscrowFactory existente:
```toml
[dependencies]
soroban-sdk = "21.7.6"

[dev-dependencies]
soroban-sdk = { version = "21.7.6", features = ["testutils"] }
```

## Relación con Otros Contratos

```
EscrowFactory (ya implementado)
    │
    ├── Al completar trade → llama ReputationRegistry.record_event(seller, 'trade_ok', trade_id)
    │                       → llama ReputationRegistry.record_event(buyer, 'trade_ok', trade_id)
    │
    ├── Al resolver disputa → record_event(winner, 'dispute_won', trade_id)
    │                        → record_event(loser, 'dispute_lost', trade_id)
    │
    └── Al timeout sin actividad → record_event(offender, 'no_show', trade_id)

ReputationRegistry (a implementar)
    │
    └── Al cambiar de nivel → (futuro) llama MicopayNFT.evolve(user, new_level)
```

## Notas Importantes

- **TTL Management**: Igual que en EscrowFactory, extiende el TTL de los datos persistentes para evitar archivado.
- **Eventos**: Emitir eventos Soroban para que el backend pueda escucharlos (`reputation_updated`, `level_changed`, `user_suspended`).
- **Initialize**: Debe recibir `admin`, `escrow_contract_id` como parámetros. Solo el admin puede cambiar el escrow_contract_id después.
