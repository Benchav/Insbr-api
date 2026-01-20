import 'dotenv/config';
import { tursoClient, testConnection } from './client.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Ejecuta el esquema SQL en Turso
 */
async function runMigration() {
    console.log('🚀 Iniciando migración de esquema a Turso...\n');

    // Verificar conexión
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ No se pudo conectar a Turso. Abortando migración.');
        process.exit(1);
    }

    try {
        // Leer el archivo SQL desde src (no desde dist)
        const schemaPath = join(process.cwd(), 'src', 'infrastructure', 'turso', 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf-8');

        // Dividir en statements individuales
        const statements = schema
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 Ejecutando ${statements.length} statements SQL...\n`);

        // Ejecutar cada statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            try {
                await tursoClient.execute(statement);

                // Extraer nombre de tabla del statement para logging
                const match = statement.match(/CREATE\s+(?:TABLE|INDEX)\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
                if (match) {
                    console.log(`✅ ${match[1]}`);
                }
            } catch (error: any) {
                console.error(`❌ Error en statement ${i + 1}:`, error.message);
                console.error('Statement:', statement.substring(0, 100) + '...');
            }
        }

        console.log('\n✅ Migración completada exitosamente!');
        console.log('\n📊 Verificando tablas creadas...');

        // Verificar tablas creadas
        const result = await tursoClient.execute(
            "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        );

        console.log(`\n✅ ${result.rows.length} tablas creadas:`);
        result.rows.forEach((row: any) => {
            console.log(`   - ${row.name}`);
        });

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
}

// Ejecutar migración
runMigration()
    .then(() => {
        console.log('\n🎉 Proceso completado!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
