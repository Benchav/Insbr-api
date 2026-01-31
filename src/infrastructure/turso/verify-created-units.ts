import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function verifyCreatedUnits() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    const results: string[] = [];

    try {
        results.push('=== VERIFICACIÓN DE UNIDADES CREADAS ===\n\n');

        // Obtener todos los productos con sus unidades
        const productsResult = await client.execute({
            sql: 'SELECT * FROM products ORDER BY name'
        });

        for (const product of productsResult.rows) {
            results.push(`\n📦 ${product.name}\n`);
            results.push(`   ID: ${product.id}\n`);
            results.push(`   Precio Menudeo: C$ ${(Number(product.retail_price) / 100).toFixed(2)}\n`);
            results.push(`   Precio Mayoreo: C$ ${(Number(product.wholesale_price) / 100).toFixed(2)}\n`);

            // Obtener unidades de este producto
            const unitsResult = await client.execute({
                sql: `SELECT * FROM unit_conversions WHERE product_id = ? ORDER BY conversion_factor`,
                args: [product.id]
            });

            if (unitsResult.rows.length > 0) {
                results.push(`\n   Unidades (${unitsResult.rows.length}):\n`);
                for (const unit of unitsResult.rows) {
                    results.push(`   ├─ ${unit.unit_name} (${unit.unit_symbol})\n`);
                    results.push(`   │  Factor: ${unit.conversion_factor}\n`);
                    results.push(`   │  Tipo: ${unit.unit_type}\n`);
                    results.push(`   │  Venta: ${unit.sales_type}\n`);
                    if (unit.retail_price) {
                        results.push(`   │  Precio Menudeo: C$ ${(Number(unit.retail_price) / 100).toFixed(2)}\n`);
                    }
                    if (unit.wholesale_price) {
                        results.push(`   │  Precio Mayoreo: C$ ${(Number(unit.wholesale_price) / 100).toFixed(2)}\n`);
                    }
                    results.push(`   │\n`);
                }
            } else {
                results.push(`   ❌ Sin unidades\n`);
            }
        }

        // Resumen
        const totalUnits = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM unit_conversions'
        });

        results.push('\n' + '='.repeat(70) + '\n');
        results.push(`\n📊 Total de unidades creadas: ${totalUnits.rows[0].count}\n`);

        const output = results.join('');
        console.log(output);

        // Guardar en archivo
        fs.writeFileSync('units-verification.txt', output);
        console.log('\n📄 Verificación guardada en: units-verification.txt');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.close();
    }
}

verifyCreatedUnits();
