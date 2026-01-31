import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
});

async function createUnitConversionsTable() {
    try {
        console.log('🚀 Creando tabla unit_conversions...\n');

        await client.execute(`
            CREATE TABLE IF NOT EXISTS unit_conversions (
                id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                unit_name TEXT NOT NULL,
                unit_symbol TEXT NOT NULL,
                conversion_factor REAL NOT NULL,
                unit_type TEXT NOT NULL CHECK(unit_type IN ('BASE', 'PURCHASE', 'SALE')),
                retail_price INTEGER,
                wholesale_price INTEGER,
                sales_type TEXT CHECK(sales_type IN ('RETAIL', 'WHOLESALE', 'BOTH')) DEFAULT 'BOTH',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
            )
        `);

        console.log('✅ Tabla unit_conversions creada\n');

        // Crear índices
        await client.execute(`CREATE INDEX IF NOT EXISTS idx_unit_conversions_product_id ON unit_conversions(product_id)`);
        console.log('✅ Índice idx_unit_conversions_product_id creado');

        await client.execute(`CREATE INDEX IF NOT EXISTS idx_unit_conversions_unit_type ON unit_conversions(unit_type)`);
        console.log('✅ Índice idx_unit_conversions_unit_type creado');

        await client.execute(`CREATE INDEX IF NOT EXISTS idx_unit_conversions_sales_type ON unit_conversions(sales_type)`);
        console.log('✅ Índice idx_unit_conversions_sales_type creado');

        await client.execute(`CREATE INDEX IF NOT EXISTS idx_unit_conversions_is_active ON unit_conversions(is_active)`);
        console.log('✅ Índice idx_unit_conversions_is_active creado');

        console.log('\n🎉 ¡Migración completada exitosamente!\n');

        // Verificar
        const columns = await client.execute(`PRAGMA table_info(unit_conversions)`);
        console.log('📋 Columnas creadas:');
        for (const col of columns.rows) {
            console.log(`  - ${col.name} (${col.type})`);
        }

    } catch (error: any) {
        console.error('\n❌ Error:', error.message);
        process.exit(1);
    } finally {
        client.close();
    }
}

createUnitConversionsTable();
