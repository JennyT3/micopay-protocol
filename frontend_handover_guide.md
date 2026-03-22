# Micopay Frontend — Guía de Entrega para Desarrolladores

Esta guía es para el desarrollador encargado de convertir los diseños HTML de Stitch UI en una aplicación móvil reactiva integrada con el backend de Micopay y el contrato Soroban.

## 1. Stack Tecnológico Recomendado
- **Framework**: React + TypeScript (vía Vite).
- **Mobile Wrapper**: Capacitor (para convertir el código web en nativo iOS/Android).
- **UI Kit**: Ionic (para imitar el aspecto nativo de los sistemas operativos).
- **Lógica de API**: Axios (con interceptores para manejar el JWT).

## 2. Puntos Críticos de Integración

### Autenticación (Stellar SEP-10)
Casi todos los endpoints del backend requieren un JWT. El flujo es:
1.  Frontend envía la dirección Stellar a `GET /auth/challenge?address=...`
2.  Recibe un Challenge XDR.
3.  El usuario firma ese XDR con su Wallet (Freighter, LOBSTR, xBull).
4.  Frontend envía el XDR firmado a `POST /auth/token` y recibe el **JWT**.
5.  **Configuración**: Guardar el JWT y enviarlo en el header `Authorization: Bearer <token>` para todas las rutas de `/trades`.

### Ciclo de Vida del Trade (HTLC)
La lógica de seguridad usa **Hashed Time-Locked Contracts**:
1.  **Vendedor Bloquea (Lock)**: Debe invocar la función `lock` en el contrato Soroban con el `secret_hash` (generado por el backend en `POST /trades`). Al confirmar en red, debe llamar a `POST /trades/:id/lock` enviando el `lock_tx_hash`.
2.  **Revelar Secreto**: Una vez recibido el efectivo, el vendedor llama a `POST /trades/:id/reveal`. El frontend obtiene el secreto descifrado con `GET /trades/:id/secret` y lo muestra como **Código QR**.
3.  **Comprador Libera**: El comprador escanea el QR y usa ese secreto para llamar a la función `release` en el contrato Soroban. Al finalizar, llama a `POST /trades/:id/complete`.

## 3. Dependencias Clave
- **`@stellar/stellar-sdk`**: Imprescindible para interactuar con Soroban.
- **`@stellar/wallet-adapter-kit`**: Para soportar múltiples wallets móviles.
- **`axios`**: Para comunicación eficiente con el backend.

## 4. Notas de Desarrollo
- **Modo Mock**: El backend tiene la bandera `MOCK_STELLAR=true`. Úsala para desarrollar el frontend rápidamente sin esperar confirmaciones reales de la red.
- **Base de Datos**: El esquema completo está en `sql/init.sql`.

---
**¡Éxito en el desarrollo! 🚀**
Micopay es una solución robusta diseñada para ser segura, rápida y escalable.
