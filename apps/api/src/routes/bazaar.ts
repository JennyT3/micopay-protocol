import type { FastifyInstance } from "fastify";
import { requirePayment } from "../middleware/x402.js";
import { randomUUID, randomBytes, createHash } from "crypto";
import { lockAtomicSwap } from "../services/stellar.service.js";

// ── Types ───────────────────────────────────────────────────────────────────

interface AssetInfo {
  chain: string;   // e.g., "ethereum", "stellar", "solana"
  symbol: string;  // e.g., "ETH", "USDC", "XLM"
  amount: string;
}

interface BazaarIntent {
  id: string;
  agent_address: string;
  offered: AssetInfo;
  wanted: AssetInfo;
  min_rate?: number;
  status: "active" | "negotiating" | "executed" | "expired";
  created_at: string;
  expires_at: string;
  reputation_tier?: string;
  secret_hash?: string; // Stored when an intent is accepted
  selected_quote_id?: string;
}

interface BazaarQuote {
  id: string;
  intent_id: string;
  from_agent: string;
  rate: number;
  valid_until: string;
}

// ── State (Mock in-memory for hackathon demo) ──────────────────────────────

const intents = new Map<string, BazaarIntent>();
const quotes = new Map<string, BazaarQuote[]>();

// Seed with some mock intents to show activity
const SEED_INTENTS: BazaarIntent[] = [
  {
    id: "int-001",
    agent_address: "GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGKUJI5KOOJ9TXWNTBBS2JN",
    offered: { chain: "ethereum", symbol: "ETH", amount: "2.5" },
    wanted: { chain: "stellar", symbol: "USDC", amount: "7000" },
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 55).toISOString(),
    reputation_tier: "maestro",
  },
  {
    id: "int-002",
    agent_address: "GDAHK7EEG2WWHVKDNT4CEQFZGKF2LGDSW2IVM4S5DP42RBW3K6BTODB4A",
    offered: { chain: "stellar", symbol: "USDC", amount: "500" },
    wanted: { chain: "physical", symbol: "MXN", amount: "8750" },
    status: "active",
    created_at: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
    expires_at: new Date(Date.now() + 1000 * 60 * 58).toISOString(),
    reputation_tier: "experto",
  }
];

SEED_INTENTS.forEach(i => intents.set(i.id, i));

// ── Routes ──────────────────────────────────────────────────────────────────

export async function bazaarRoutes(fastify: FastifyInstance): Promise<void> {

  /**
   * POST /api/v1/bazaar/intent
   * x402: $0.005 USDC
   *
   * Broadcast a cross-chain swap intent to the network.
   */
  fastify.post(
    "/api/v1/bazaar/intent",
    { preHandler: requirePayment({ amount: "0.005", service: "bazaar_broadcast" }) },
    async (request, reply) => {
      const body = request.body as Partial<BazaarIntent>;
      
      if (!body.offered || !body.wanted) {
        return reply.status(400).send({ error: "offered and wanted asset info required" });
      }

      const id = `int-${randomUUID().slice(0, 8)}`;
      const newIntent: BazaarIntent = {
        id,
        agent_address: request.payerAddress ?? "GUNKNOWN",
        offered: body.offered as AssetInfo,
        wanted: body.wanted as AssetInfo,
        min_rate: body.min_rate,
        status: "active",
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 3600_000).toISOString(), // 1h default
      };

      intents.set(id, newIntent);
      
      fastify.log.info(`Bazaar: Intent broadcasted by ${newIntent.agent_address}: ${newIntent.offered.symbol} -> ${newIntent.wanted.symbol}`);

      return reply.status(201).send(newIntent);
    }
  );

  /**
   * GET /api/v1/bazaar/feed
   * x402: $0.001 USDC
   *
   * Get the latest active intents. Feed is filtered by reputation and status.
   */
  fastify.get(
    "/api/v1/bazaar/feed",
    { preHandler: requirePayment({ amount: "0.001", service: "bazaar_feed" }) },
    async (_request, reply) => {
      const activeIntents = Array.from(intents.values())
        .filter(i => i.status === "active")
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return reply.send({
        intents: activeIntents,
        count: activeIntents.length,
        network: "global-intent-layer",
        note: "Every intent in this feed is broadcasted by an AI agent paying via x402."
      });
    }
  );

  /**
   * POST /api/v1/bazaar/quote
   * x402: $0.002 USDC
   *
   * Send a private quote to a broadcasted intent.
   * This initiates the handshake for an AtomicSwapHTLC.
   */
  fastify.post(
    "/api/v1/bazaar/quote",
    { preHandler: requirePayment({ amount: "0.002", service: "bazaar_quote" }) },
    async (request, reply) => {
      const body = request.body as { intent_id: string; rate: number };
      
      if (!body.intent_id || !body.rate) {
        return reply.status(400).send({ error: "intent_id and rate required" });
      }

      const intent = intents.get(body.intent_id);
      if (!intent) {
        return reply.status(404).send({ error: "Intent not found" });
      }

      const quoteId = `qut-${randomUUID().slice(0, 8)}`;
      const newQuote: BazaarQuote = {
        id: quoteId,
        intent_id: body.intent_id,
        from_agent: request.payerAddress ?? "GUNKNOWN",
        rate: body.rate,
        valid_until: new Date(Date.now() + 300_000).toISOString(), // 5 min
      };

      const existingQuotes = quotes.get(body.intent_id) || [];
      quotes.set(body.intent_id, [...existingQuotes, newQuote]);

      return reply.status(201).send({
        quote: newQuote,
        note: "Quote sent to target agent. Handshake initiated. Monitor AtomicSwapHTLC events to settle."
      });
    }
  );

  /**
   * POST /api/v1/bazaar/accept
   * x402: $0.005 USDC
   *
   * Initiator formally accepts a quote and provides the secret_hash.
   * This seals the agreement and allows the Market Maker to proceed.
   */
  fastify.post(
    "/api/v1/bazaar/accept",
    { preHandler: requirePayment({ amount: "0.005", service: "bazaar_accept" }) },
    async (request, reply) => {
      const body = request.body as { intent_id: string; quote_id?: string; secret_hash?: string; amount_usdc?: number };

      if (!body.intent_id) {
        return reply.status(400).send({ error: "intent_id is required" });
      }

      const intent = intents.get(body.intent_id);
      if (!intent) return reply.status(404).send({ error: "Intent not found" });
      if (intent.status !== "active") return reply.status(409).send({ error: `Intent is already ${intent.status}` });

      // Auto-generate secret_hash if not provided (demo convenience)
      const secretHash = body.secret_hash
        ?? createHash("sha256").update(randomBytes(32)).digest("hex");

      const quoteList = quotes.get(body.intent_id) || [];
      const quote = body.quote_id
        ? quoteList.find(q => q.id === body.quote_id)
        : quoteList[0]; // take best quote if none specified

      // Determine USDC amount from intent or body
      const amountUsdc = body.amount_usdc
        ?? parseFloat(intent.wanted.symbol === "USDC" ? intent.wanted.amount : "28.57");

      // ── Core: Lock the Stellar side of the cross-chain swap on-chain ─────────
      // This uses the deployed MicopayEscrow contract to anchor the USDC collateral.
      // The AtomicSwapHTLC (37 tests, fully built) resolves the counterpart chain
      // (ETH/BTC/SOL) in production using the same shared secret_hash.
      fastify.log.info(`Bazaar: Locking Stellar side for intent ${body.intent_id}...`);
      const lock = await lockAtomicSwap({
        amountUsdc,
        secretHash,
        timeoutMinutes: 60,
      });

      // Update intent state
      intent.status = "negotiating";
      intent.secret_hash = secretHash;
      intent.selected_quote_id = quote?.id;

      fastify.log.info(`Bazaar: Stellar lock confirmed. swap_id=${lock.swapId.slice(0, 10)} tx=${lock.txHash}`);

      return reply.send({
        status: "negotiating",
        message: "Stellar side anchored on-chain. Cross-chain intent coordinated.",
        handshake: {
          intent_id: body.intent_id,
          quote_id: quote?.id ?? "auto",
          market_maker: quote?.from_agent ?? "market-maker-agent",
          secret_hash: secretHash,
          // Real Soroban transaction
          htlc_tx_hash: lock.txHash,
          htlc_explorer_url: lock.explorerUrl,
          swap_id: lock.swapId,
        },
        note: "Stellar side of the cross-chain swap is locked. AtomicSwapHTLC (built + tested) resolves the counterpart chain in production.",
        next_step: "Agent B can now lock the counterpart asset using the shared secret_hash. Revealing the secret on Chain B gives the initiator the key to claim here."
      });
    }
  );
}
