import 'dotenv/config';
import { tursoClient, testConnection } from './client.js';
import { readFileSync } from 'fs';
import { join } from 'path';

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
        // Leer el archivo SQL desde src
        const schemaPath = join(process.cwd(), 'src', 'infrastructure', 'turso', 'schema.sql');
        const schema = readFileSync(schemaPath, 'utf-8');

        console.log(`📝 Ejecutando esquema SQL...\n`);

        // Ejecutar el esquema completo
        await tursoClient.executeMultiple(schema);

        console.log('\n✅ Esquema ejecutado exitosamente!');
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
