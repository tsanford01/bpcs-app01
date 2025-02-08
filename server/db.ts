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

// Configure pool with optimized settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients in pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 10000, // How long to wait for a connection
  maxUses: 7500 // Number of times a client can be reused before being replaced
});

export const db = drizzle({ client: pool, schema });

// Enhanced error handling for the pool
pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  // Only attempt reconnection for specific error types
  if (err.message.includes('connection') || err.message.includes('terminated')) {
    console.log("Attempting to reconnect to database...");
    pool.connect()
      .then(() => console.log("Database reconnected successfully"))
      .catch(console.error);
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