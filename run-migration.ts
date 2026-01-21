import { tursoClient } from './src/infrastructure/turso/client.js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
    try {
        console.log('🔄 Ejecutando migración: add_credit_account_fields.sql...\n');

        // Leer el archivo de migración
        const migrationPath = path.join(__dirname, 'migrations', 'add_credit_account_fields.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        // Dividir por líneas y ejecutar cada ALTER TABLE por separado
        const statements = migrationSQL
            .split('\n')
            .filter(line => line.trim().startsWith('ALTER TABLE'))
            .map(line => line.trim().replace(';', ''));

        for (const statement of statements) {
            console.log(`Ejecutando: ${statement}`);
            await tursoClient.execute(statement);
            console.log('✅ Completado\n');
        }

        // Verificar que las columnas se agregaron
        console.log('🔍 Verificando estructura de la tabla credit_accounts...\n');
        const result = await tursoClient.execute('SELECT * FROM pragma_table_info(\'credit_accounts\')');

        console.log('Columnas en credit_accounts:');
        result.rows.forEach((row: any) => {
            console.log(`  - ${row.name} (${row.type})`);
        });

        console.log('\n✅ Migración completada exitosamente!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error);
        process.exit(1);
    }
}

runMigration();
