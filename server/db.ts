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
  max: 10, // Reduced from 20 to prevent connection overload
  idleTimeoutMillis: 60000, // Increased to 1 minute
  connectionTimeoutMillis: 5000, // Reduced for faster failure detection
  maxUses: 10000, // Increased for better connection reuse
  allowExitOnIdle: true // Allow clean shutdown
});

export const db = drizzle({ client: pool, schema });

// Enhanced error handling and reconnection logic
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  if (err.message.includes('connection') || err.message.includes('terminated')) {
    console.log("Attempting to reconnect to database...");
    // Implement exponential backoff for reconnection
    setTimeout(() => {
      pool.connect()
        .then(() => console.log("Database reconnected successfully"))
        .catch(err => {
          console.error("Database reconnection failed:", err);
          process.exit(1); // Exit if reconnection fails
        });
    }, 1000);
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

// Prevent unhandled promise rejections from crashing the app
process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});