// src/scripts/run-turso-migration.ts
import { createClient } from '@libsql/client';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!TURSO_DATABASE_URL || !TURSO_AUTH_TOKEN) {
  console.error('Faltan variables TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en .env');
  process.exit(1);
}

const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });

async function runMigration() {
  const migrationPath = path.resolve(__dirname, '../infrastructure/turso/migrations/update_transfers_flow.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');
  // Separar por ; y ejecutar cada statement
  const statements = sql.split(';').map(s => s.trim()).filter(s => s.length > 0);
  for (const statement of statements) {
    try {
      console.log('Ejecutando:', statement.slice(0, 80) + (statement.length > 80 ? '...' : ''));
      await client.execute(statement);
      console.log('✅ OK');
    } catch (err) {
      console.error('❌ Error:', err.message);
      process.exit(1);
    }
  }
  console.log('🚀 Migración completada.');
  process.exit(0);
}

runMigration();
