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

// Configure pool with optimized settings for better stability
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 3, // Reduced from 5 to prevent connection overload
  idleTimeoutMillis: 15000, // Reduced to 15 seconds for faster recycling
  connectionTimeoutMillis: 5000, // Increased for more reliable connections
  maxUses: 5000, // Reduced to prevent connection staleness
  allowExitOnIdle: true // Allow clean shutdown
});

export const db = drizzle({ client: pool, schema });

// Enhanced error handling and reconnection logic
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10; // Increased max attempts
const INITIAL_RECONNECT_DELAY = 500; // Start with shorter delay

pool.on('connect', (client) => {
  console.log(`[DB] New connection established (total: ${pool.totalCount})`);
  reconnectAttempts = 0; // Reset attempts on successful connection

  client.on('error', (err) => {
    console.error('[DB] Client error:', err.message);
  });
});

pool.on('error', async (err) => {
  console.error('[DB] Pool error:', err.message);

  if (err.message.includes('connection') || err.message.includes('terminated')) {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(INITIAL_RECONNECT_DELAY * Math.pow(1.5, reconnectAttempts), 10000);
      console.log(`[DB] Attempting to reconnect (attempt ${reconnectAttempts + 1}) in ${delay}ms...`);

      await new Promise(resolve => setTimeout(resolve, delay));

      try {
        await pool.connect();
        console.log("[DB] Reconnected successfully");
        reconnectAttempts = 0;
      } catch (reconnectError) {
        console.error("[DB] Reconnection failed:", reconnectError.message);
        reconnectAttempts++;
      }
    } else {
      console.error("[DB] Maximum reconnection attempts reached");
      process.exit(1);
    }
  }
});

// Simplified monitoring interval
const monitoringInterval = setInterval(() => {
  if (pool.totalCount > 0) {
    console.log(`[DB] Pool status - total: ${pool.totalCount}, idle: ${pool.idleCount}, waiting: ${pool.waitingCount}`);
  }
}, 30000);

// Graceful shutdown
const shutdown = async () => {
  clearInterval(monitoringInterval);
  console.log('[DB] Initiating graceful shutdown...');

  try {
    await pool.end();
    console.log('[DB] Database connections closed');
    process.exit(0);
  } catch (err) {
    console.error('[DB] Error during shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('unhandledRejection', (err) => {
  console.error('[DB] Unhandled rejection:', err);
});