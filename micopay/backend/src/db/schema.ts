import pg from 'pg';
import { config } from '../config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl,
});

// Test connection on startup
pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL error:', err);
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export async function getOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const result = await pool.query(text, params);
  return result.rows[0] || null;
}

export async function getMany<T = any>(text: string, params?: any[]): Promise<T[]> {
  const result = await pool.query(text, params);
  return result.rows;
}

export async function execute(text: string, params?: any[]) {
  return pool.query(text, params);
}

export default { pool, query, getOne, getMany, execute };
