import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const MAX_RETRIES = 5;
const RETRY_DELAY = 5000; // 5 seconds

// Configure pool with better defaults
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 10000, // 10 seconds
  max: 20, // maximum number of clients
  idleTimeoutMillis: 30000, // 30 seconds
  maxUses: 7500, // number of times a client can be reused
});

// Implement connection retry logic
async function connectWithRetry(retries = MAX_RETRIES) {
  try {
    await pool.connect();
    console.log('Database connected successfully');
    return true;
  } catch (err) {
    console.error('Database connection error:', err);
    if (retries > 0) {
      console.log(`Retrying connection in ${RETRY_DELAY}ms... (${retries} attempts remaining)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return connectWithRetry(retries - 1);
    }
    throw err;
  }
}

// Initialize connection
connectWithRetry().catch(err => {
  console.error('Failed to connect to database after all retries:', err);
  process.exit(1);
});

// Add error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Attempt to reconnect if the error is connection-related
  if (err.message.includes('connection') || err.message.includes('terminated')) {
    connectWithRetry().catch(console.error);
  }
});

// Cleanup on application shutdown
process.on('SIGINT', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Closing database pool...');
  await pool.end();
  process.exit(0);
});

export const db = drizzle({ 
  client: pool,
  schema,
  logger: true 
});