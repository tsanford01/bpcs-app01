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
  maxLifetimeSeconds: 3600, // Maximum lifetime of 1 hour per connection
  allowExitOnIdle: true // Allow clean shutdown
});

export const db = drizzle({ client: pool, schema });

// Enhanced error handling and reconnection logic with exponential backoff
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  if (err.message.includes('connection') || err.message.includes('terminated')) {
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttempts);
      console.log(`Attempting to reconnect to database (attempt ${reconnectAttempts + 1})...`);
      setTimeout(() => {
        pool.connect()
          .then(() => {
            console.log("Database reconnected successfully");
            reconnectAttempts = 0; // Reset counter on successful connection
          })
          .catch(err => {
            console.error("Database reconnection failed:", err);
            reconnectAttempts++;
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
              console.error("Maximum reconnection attempts reached. Exiting...");
              process.exit(1);
            }
          });
      }, delay);
    }
  }
});

// Graceful shutdown handlers
const shutdown = async () => {
  console.log('Closing database pool...');
  try {
    await pool.end();
    console.log('Database pool closed successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error closing database pool:', err);
    process.exit(1);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Monitor connection pool health
setInterval(() => {
  const poolStatus = pool.totalCount + "/" + pool.idleCount + "/" + pool.waitingCount;
  console.log(`Pool status (total/idle/waiting): ${poolStatus}`);
}, 30000);

// Prevent unhandled promise rejections from crashing the app
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});