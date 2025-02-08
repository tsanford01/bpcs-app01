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
  max: 5, // Reduced from 10 to prevent connection overload
  idleTimeoutMillis: 30000, // Reduced to 30 seconds
  connectionTimeoutMillis: 3000, // Reduced for faster failure detection
  maxUses: 7500, // Reduced to prevent connection staleness
  allowExitOnIdle: true // Allow clean shutdown
});

export const db = drizzle({ client: pool, schema });

// Enhanced error handling and reconnection logic with exponential backoff
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;

// Monitor individual connection lifecycle
pool.on('connect', (client) => {
  console.log(`[DB] New connection established (total: ${pool.totalCount})`);

  client.on('error', (err) => {
    console.error('[DB] Client error:', err.message);
  });

  client.on('end', () => {
    console.log('[DB] Client connection ended');
  });
});

pool.on('acquire', () => {
  console.log(`[DB] Connection acquired (total/idle/waiting): ${pool.totalCount}/${pool.idleCount}/${pool.waitingCount}`);
});

pool.on('remove', () => {
  console.log('[DB] Connection removed from pool');
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected database error:', err);
  if (err.message.includes('connection') || err.message.includes('terminated')) {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
      console.log(`[DB] Attempting to reconnect to database (attempt ${reconnectAttempts + 1})...`);
      setTimeout(() => {
        pool.connect()
          .then(() => {
            console.log("[DB] Database reconnected successfully");
            reconnectAttempts = 0; // Reset counter on successful connection
          })
          .catch(err => {
            console.error("[DB] Database reconnection failed:", err);
            reconnectAttempts++;
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              console.error("[DB] Maximum reconnection attempts reached. Exiting...");
              process.exit(1);
            }
          });
      }, delay);
    }
  }
});

// Graceful shutdown handlers
const shutdown = async () => {
  console.log('[DB] Closing database pool...');
  try {
    await pool.end();
    console.log('[DB] Database pool closed successfully');
    process.exit(0);
  } catch (err) {
    console.error('[DB] Error closing database pool:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Monitor connection pool health more frequently
setInterval(() => {
  const poolStatus = pool.totalCount + "/" + pool.idleCount + "/" + pool.waitingCount;
  const memory = process.memoryUsage();
  console.log(`[DB] Pool status (total/idle/waiting): ${poolStatus}`);
  console.log('[DB] Memory usage:', {
    heapUsed: `${Math.round(memory.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memory.heapTotal / 1024 / 1024)}MB`,
    external: `${Math.round(memory.external / 1024 / 1024)}MB`,
    rss: `${Math.round(memory.rss / 1024 / 1024)}MB`
  });
}, 15000);

// Prevent unhandled promise rejections from crashing the app
process.on('unhandledRejection', (err) => {
  console.error('[DB] Unhandled promise rejection:', err);
});