import sql from 'mssql';
import { config } from './config';

let pool: sql.ConnectionPool | undefined;

export async function getPool(): Promise<sql.ConnectionPool> {
  if (pool?.connected) return pool;
  pool = await new sql.ConnectionPool({
    server: config.db.server,
    port: config.db.port,
    database: config.db.database,
    user: config.db.user,
    password: config.db.password,
    options: { encrypt: false, trustServerCertificate: true },
    pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
  }).connect();
  return pool;
}

export async function closePool(): Promise<void> {
  await pool?.close();
  pool = undefined;
}

export { sql };
