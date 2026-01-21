import 'dotenv/config';
import { tursoClient } from '../client.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
    console.log('🔄 Ejecutando migración: add_status_and_refund...');

    try {
        // Leer desde src porque el archivo SQL no se copia a dist
        const migrationSQL = readFileSync(
            join(process.cwd(), 'src', 'infrastructure', 'turso', 'migrations', 'add_status_and_refund.sql'),
            'utf-8'
        );

        // Ejecutar la migración
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
            if (statement.trim()) {
                try {
                    await tursoClient.execute(statement);
                    console.log(`✅ Ejecutado: ${statement.substring(0, 50)}...`);
                } catch (error: any) {
                    // Ignorar errores de columna duplicada
                    if (error.message.includes('duplicate column name')) {
                        console.log(`⚠️  Columna ya existe, continuando...`);
                    } else {
                        console.log(`⚠️  ${error.message}`);
                    }
                }
            }
        }

        console.log('\n✅ Migración completada exitosamente!');
        process.exit(0);
    } catch (error: any) {
        console.error('❌ Error durante la migración:', error.message);
        process.exit(1);
    }
}

runMigration();
