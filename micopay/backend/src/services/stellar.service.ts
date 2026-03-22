import { config } from '../config.js';

/**
 * Stellar/Soroban service.
 *
 * In MVP mode (MOCK_STELLAR=true), all on-chain verifications return success.
 * When connected to real testnet, uses Stellar SDK for verification.
 */

export async function verifyLockOnChain(
  stellarTradeId: string,
  expectedSellerAddress: string,
  expectedAmountStroops: bigint,
): Promise<boolean> {
  if (config.mockStellar) {
    console.log(`[MOCK] Verifying lock on-chain for trade ${stellarTradeId} — returning true`);
    return true;
  }

  // Real implementation would use @stellar/stellar-sdk here:
  // 1. Connect to Soroban RPC
  // 2. Simulate a get_trade() call
  // 3. Parse the result and verify seller/amount/status match
  //
  // For now, this is a placeholder for when MOCK_STELLAR=false
  try {
    // skill: frontend-stellar-sdk.md — use rpc.Server (not SorobanRpc.Server)
    const StellarSdk = await import('@stellar/stellar-sdk');
    const { Contract, TransactionBuilder, Networks, Keypair, nativeToScVal, rpc: rpcModule } = StellarSdk;

    const rpc = new rpcModule.Server(config.stellarRpcUrl);
    const networkPassphrase =
      config.stellarNetwork === 'TESTNET' ? Networks.TESTNET : Networks.PUBLIC;

    const contract = new Contract(config.escrowContractId);
    const account = await rpc.getAccount(Keypair.fromSecret(config.platformSecretKey).publicKey());

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'get_trade',
          nativeToScVal(Buffer.from(stellarTradeId, 'hex'), { type: 'bytes' }),
        ),
      )
      .setTimeout(30)
      .build();

    const simResult = await rpc.simulateTransaction(tx);

    if (rpcModule.Api.isSimulationError(simResult)) {
      console.error('Simulation error:', simResult);
      return false;
    }

    // In real implementation, parse simResult to verify trade data
    return true;
  } catch (err) {
    console.error('verifyLockOnChain error:', err);
    return false;
  }
}

/**
 * Wait for a transaction to be confirmed on-chain.
 */
export async function waitForTransaction(hash: string, maxAttempts = 10): Promise<boolean> {
  if (config.mockStellar) {
    console.log(`[MOCK] Waiting for tx ${hash} — returning success`);
    return true;
  }

  try {
    const { rpc: rpcModule } = await import('@stellar/stellar-sdk');
    const rpc = new rpcModule.Server(config.stellarRpcUrl);

    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const result = await rpc.getTransaction(hash);

      if (result.status === rpcModule.Api.GetTransactionStatus.SUCCESS) {
        return true;
      }
      if (result.status === rpcModule.Api.GetTransactionStatus.FAILED) {
        throw new Error('Transaction failed on-chain');
      }
    }
    throw new Error('Transaction timeout');
  } catch (err) {
    console.error('waitForTransaction error:', err);
    return false;
  }
}
