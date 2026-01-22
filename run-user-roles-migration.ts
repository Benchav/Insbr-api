import 'dotenv/config';
import { tursoClient } from './src/infrastructure/turso/client.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        console.log('🔄 Ejecutando migración: update_user_roles.sql...\n');

        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'migrations', 'update_user_roles.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Dividir por líneas y ejecutar cada statement
        const statements = migrationSQL
            .split('\n')
            .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
            .join('\n')
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0);

        for (const statement of statements) {
            console.log(`Ejecutando: ${statement.substring(0, 50)}...`);
            await tursoClient.execute(statement);
            console.log('✅ Completado\n');
        }

        console.log('\n✅ Migración completada exitosamente!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
        process.exit(1);
    }
}

runMigration();
