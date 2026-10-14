import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import { dbConfig } from './db.js';

const dbDir = join(import.meta.dirname, '..', 'db');

export async function initDb() {
  const { database, ...config } = dbConfig;
  const conn = await mysql.createConnection({ ...config, multipleStatements: true });

  try {
    if (process.env.DB_RESET === 'true') {
      await conn.query(`DROP DATABASE IF EXISTS \`${database}\``);
      console.log(`Dropped database '${database}'`);
    }

    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\`
         CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await conn.changeUser({ database });
    await conn.query(await readFile(join(dbDir, 'schema.sql'), 'utf8'));

    const [[{ count }]] = await conn.query('SELECT COUNT(*) AS count FROM products');
    if (count === 0) {
      await conn.query(await readFile(join(dbDir, 'seed.sql'), 'utf8'));
      console.log('Loaded sample products');
    }
  } finally {
    await conn.end();
  }

  console.log(`Database '${database}' ready`);
}
