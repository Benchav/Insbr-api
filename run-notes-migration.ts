import 'dotenv/config';
import { tursoClient } from './src/infrastructure/turso/client.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
    try {
        console.log('🚀 Iniciando migración: add_notes_to_credit_accounts');

        const sqlPath = path.join(process.cwd(), 'migrations', 'add_notes_to_credit_accounts.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await tursoClient.execute(sql);

        console.log('✅ Migración completada exitosamente');
    } catch (error) {
        console.error('❌ Error en la migración:', error);
    }
}

runMigration();
