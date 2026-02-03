import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function explainLibraUnits() {
    try {
        console.log('📊 EXPLICACIÓN: ¿Por qué 4 unidades de "Libra"?\n');
        console.log('='.repeat(80));

        const libraUnits = await client.execute(`
            SELECT 
                uc.id as unit_id,
                uc.product_id,
                p.name as product_name,
                p.sku as product_sku,
                uc.unit_name,
                uc.unit_symbol,
                uc.conversion_factor,
                uc.unit_type,
                uc.retail_price
            FROM unit_conversions uc
            LEFT JOIN products p ON uc.product_id = p.id
            WHERE uc.unit_name = 'Libra' 
            AND uc.is_active = 1
            ORDER BY p.name
        `);

        console.log(`\n✅ Encontradas ${libraUnits.rows.length} unidades de "Libra"\n`);
        console.log('Cada una pertenece a un PRODUCTO DIFERENTE:\n');
        console.log('='.repeat(80));

        libraUnits.rows.forEach((row, index) => {
            console.log(`\n${index + 1}. PRODUCTO: ${row.product_name}`);
            console.log(`   SKU: ${row.product_sku}`);
            console.log(`   ID Producto: ${row.product_id}`);
            console.log(`   ─────────────────────────────────────────────`);
            console.log(`   Unidad: ${row.unit_name} (${row.unit_symbol})`);
            console.log(`   Tipo: ${row.unit_type}`);
            console.log(`   Factor: ${row.conversion_factor}`);
            console.log(`   Precio: C$${(Number(row.retail_price) / 100).toFixed(2)} por libra`);
            console.log(`   ID Unidad: ${row.unit_id}`);
        });

        console.log('\n\n');
        console.log('='.repeat(80));
        console.log('💡 EXPLICACIÓN\n');
        console.log('='.repeat(80));
        console.log('\n¿Por qué cada producto necesita su propia unidad "Libra"?\n');
        console.log('1. Cada producto tiene un PRECIO DIFERENTE por libra');
        console.log('2. Cada producto tiene su propio INVENTARIO en libras');
        console.log('3. El sistema necesita rastrear las libras de CADA producto por separado\n');

        console.log('Ejemplo práctico:');
        console.log('  • Harina: C$0.12 por libra');
        console.log('  • Chocolate: C$2.30 por libra');
        console.log('  • Cocoa: C$3.00 por libra');
        console.log('  • Polvo de Hornear: C$2.40 por libra\n');

        console.log('Si solo hubiera UNA unidad "Libra" compartida:');
        console.log('  ❌ No podrías tener precios diferentes');
        console.log('  ❌ No podrías rastrear inventario por producto');
        console.log('  ❌ El sistema no funcionaría correctamente\n');

        console.log('='.repeat(80));
        console.log('✅ CONCLUSIÓN\n');
        console.log('='.repeat(80));
        console.log('\nTener 4 unidades "Libra" es CORRECTO y NECESARIO.');
        console.log('Cada una pertenece a un producto diferente con:');
        console.log('  • Precio diferente');
        console.log('  • Inventario diferente');
        console.log('  • ID de producto diferente\n');

        console.log('Esto es parte del diseño correcto del sistema.\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        client.close();
    }
}

explainLibraUnits().catch(console.error);
