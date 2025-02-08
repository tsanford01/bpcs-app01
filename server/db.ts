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

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

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