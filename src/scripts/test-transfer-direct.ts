import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

async function main() {
  const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });

  // Crear transferencia
  const insertTransfer = `INSERT INTO transfers (id, from_branch_id, to_branch_id, status, type, notes, created_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
  const transferId = `TEST-${Date.now()}`;
  const now = new Date().toISOString();
  await client.execute({
    sql: insertTransfer,
    args: [transferId, 'BRANCH-001', 'BRANCH-002', 'PENDING', 'SEND', 'Test integración directa', 'USER-ADMIN', now]
  });

  // Actualizar transferencia con shippedBy y shippedAt
  const updateTransfer = `UPDATE transfers SET shipped_by = ?, shipped_at = ?, status = ? WHERE id = ?`;
  await client.execute({
    sql: updateTransfer,
    args: ['USER-ADMIN', new Date().toISOString(), 'IN_TRANSIT', transferId]
  });

  // Leer transferencia y mostrar
  const result = await client.execute({
    sql: 'SELECT * FROM transfers WHERE id = ?',
    args: [transferId]
  });
  console.log('Transferencia final:', result.rows[0]);
}

main().catch(e => { console.error(e); process.exit(1); });
