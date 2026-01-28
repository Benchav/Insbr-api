import 'dotenv/config';
import { createClient } from '@libsql/client';

const dbUrl = process.env.TURSO_DATABASE_URL;
const dbToken = process.env.TURSO_AUTH_TOKEN;

if (!dbUrl || !dbToken) {
  console.error('Faltan TURSO_DATABASE_URL o TURSO_AUTH_TOKEN en el .env');
  process.exit(1);
}

async function addCreditDaysColumn() {
  const client = createClient({
    url: dbUrl,
    authToken: dbToken,
  });
  try {
    await client.execute('ALTER TABLE customers ADD COLUMN credit_days INTEGER DEFAULT 0;');
    console.log('Columna credit_days agregada correctamente.');
  } catch (err) {
    if (err.message.includes('duplicate column name')) {
      console.log('La columna credit_days ya existe.');
    } else {
      console.error('Error al agregar la columna:', err.message);
    }
  } finally {
    await client.close();
  }
}

addCreditDaysColumn();
