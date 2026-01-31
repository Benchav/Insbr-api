import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
});

async function checkSchema() {
    try {
        console.log('🔍 Verificando esquema de base de datos...\n');

        // Ver todas las tablas
        const tables = await client.execute(`
            SELECT name FROM sqlite_master WHERE type='table' ORDER BY name
        `);

        console.log('📋 Tablas existentes:');
        for (const row of tables.rows) {
            console.log(`  - ${row.name}`);
        }

        // Ver si unit_conversions ya existe
        const unitConvExists = await client.execute(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='unit_conversions'
        `);

        if (unitConvExists.rows.length > 0) {
            console.log('\n✅ La tabla unit_conversions YA EXISTE\n');

            const columns = await client.execute(`PRAGMA table_info(unit_conversions)`);
            console.log('Columnas:');
            for (const col of columns.rows) {
                console.log(`  - ${col.name} (${col.type})`);
            }
        } else {
            console.log('\n❌ La tabla unit_conversions NO EXISTE\n');
        }

        // Ver columnas de products
        console.log('\n📋 Columnas de products:');
        const productCols = await client.execute(`PRAGMA table_info(products)`);
        for (const col of productCols.rows) {
            console.log(`  - ${col.name} (${col.type})`);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.close();
    }
}

checkSchema();
