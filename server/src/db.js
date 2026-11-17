import mysql from 'mysql2/promise';
import 'dotenv/config';

// Real credentials belong in server/.env (see .env.example), not in source.
export const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'inventory',
};

export const pool = mysql.createPool({ ...dbConfig, connectionLimit: 10 });

// Runs fn(conn) inside a transaction; rolls back if fn throws.
export async function withTransaction(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback().catch(() => {});
    throw err;
  } finally {
    conn.release();
  }
}
