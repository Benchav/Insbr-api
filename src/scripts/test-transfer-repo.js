// src/scripts/test-transfer-repo.js
const { createClient } = require('@libsql/client');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { TransferRepositoryTurso } = require('../infrastructure/turso/repositories/transfer.repository.turso.js');

const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

async function main() {
  const client = createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN });
  const repo = new TransferRepositoryTurso();
  // Test: crear transferencia con todos los campos nuevos
  const transfer = await repo.create({
    fromBranchId: 'BRANCH-001',
    toBranchId: 'BRANCH-002',
    items: [
      { productId: 'PROD-001', productName: 'Producto Test', quantity: 1 }
    ],
    notes: 'Test integración',
    createdBy: 'USER-ADMIN',
    type: 'SEND',
    status: 'PENDING'
  });
  console.log('Transferencia creada:', transfer);
  // Test: actualizar transferencia con shippedBy y shippedAt
  const updated = await repo.update(transfer.id, {
    shippedBy: 'USER-ADMIN',
    shippedAt: new Date().toISOString(),
    status: 'IN_TRANSIT'
  });
  console.log('Transferencia actualizada:', updated);
}

main().catch(e => { console.error(e); process.exit(1); });
