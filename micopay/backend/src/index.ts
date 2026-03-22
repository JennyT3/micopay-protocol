import Fastify from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fastifyCors from '@fastify/cors';
import { config } from './config.js';
import { authRoutes } from './routes/auth.js';
import { userRoutes } from './routes/users.js';
import { tradeRoutes } from './routes/trades.js';
import { stellarRoutes } from './routes/stellar.js';
import { AppError } from './utils/errors.js';

const app = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  },
});

// --- Plugins ---

// CORS — allow frontend dev server
app.register(fastifyCors, { origin: true });

// JWT
app.register(fastifyJwt, {
  secret: config.jwtSecret,
});

// Rate limit (optional — gracefully skip if not available)
try {
  const rateLimit = await import('@fastify/rate-limit');
  app.register(rateLimit.default, { global: false });
} catch {
  console.warn('⚠️  @fastify/rate-limit not installed, skipping rate limiting');
}

// --- Global error handler ---
app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: error.name,
      message: error.message,
    });
    return;
  }

  // Fastify validation errors
  if (error.validation) {
    reply.status(400).send({
      error: 'ValidationError',
      message: error.message,
    });
    return;
  }

  // Unknown errors
  request.log.error(error);
  reply.status(500).send({
    error: 'InternalServerError',
    message: 'Something went wrong',
  });
});

// --- Routes ---

app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  mockStellar: config.mockStellar,
}));

app.register(authRoutes, { prefix: '' });
app.register(userRoutes, { prefix: '' });
app.register(tradeRoutes, { prefix: '' });
app.register(stellarRoutes, { prefix: '' });

// --- Start server ---

async function start() {
  try {
    await app.listen({ port: config.port, host: '0.0.0.0' });
    console.log(`\n🍄 Micopay MVP Backend running on http://localhost:${config.port}`);
    console.log(`   Mock Stellar: ${config.mockStellar ? 'ON (no on-chain verification)' : 'OFF (real Soroban RPC)'}`);
    console.log(`   Database: ${config.databaseUrl.replace(/\/\/.*@/, '//***@')}\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
