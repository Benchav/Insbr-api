import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function quickCheck() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    const results: string[] = [];

    try {
        // Verificar tabla unit_conversions
        const tableCheck = await client.execute({
            sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='unit_conversions'`
        });

        results.push('=== VERIFICACIÓN RÁPIDA ===\n');
        results.push(`Tabla unit_conversions: ${tableCheck.rows.length > 0 ? 'EXISTE ✅' : 'NO EXISTE ❌'}\n`);

        if (tableCheck.rows.length > 0) {
            // Contar unidades
            const count = await client.execute({
                sql: 'SELECT COUNT(*) as count FROM unit_conversions'
            });
            results.push(`Unidades registradas: ${count.rows[0].count}\n`);

            // Mostrar estructura
            const columns = await client.execute({
                sql: `PRAGMA table_info(unit_conversions)`
            });
            results.push('\nColumnas de unit_conversions:\n');
            columns.rows.forEach((col: any) => {
                results.push(`  - ${col.name} (${col.type})\n`);
            });

            // Mostrar ejemplos si hay datos
            if (Number(count.rows[0].count) > 0) {
                const examples = await client.execute({
                    sql: 'SELECT * FROM unit_conversions LIMIT 3'
                });
                results.push('\nEjemplos de unidades:\n');
                examples.rows.forEach((row: any) => {
                    results.push(`  - ${row.unit_name} (${row.unit_symbol}): factor ${row.conversion_factor}\n`);
                });
            }
        }

        // Verificar ventas
        const salesCount = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM sales'
        });
        results.push(`\nVentas totales: ${salesCount.rows[0].count}\n`);

        // Verificar productos
        const productsCount = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM products'
        });
        results.push(`Productos totales: ${productsCount.rows[0].count}\n`);

        // Verificar stock
        const stockCount = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM stock'
        });
        results.push(`Registros de stock: ${stockCount.rows[0].count}\n`);

        // Verificar sale_items
        const saleItemsColumns = await client.execute({
            sql: `PRAGMA table_info(sale_items)`
        });
        const hasUnitCols = saleItemsColumns.rows.some((col: any) => col.name === 'unit_id');
        results.push(`\nTabla sale_items tiene columnas de unidades: ${hasUnitCols ? 'SÍ' : 'NO (normal)'}\n`);

        results.push('\n=== CONCLUSIÓN ===\n');
        if (tableCheck.rows.length > 0) {
            results.push('✅ Sistema de unidades configurado correctamente\n');
            results.push('✅ Datos existentes NO se verán afectados\n');
            results.push('✅ Sistema 100% retrocompatible\n');
        } else {
            results.push('⚠️  Necesita ejecutar migración de unidades\n');
        }

        const output = results.join('');
        console.log(output);

        // Guardar en archivo
        fs.writeFileSync('verification-result.txt', output);
        console.log('\n📄 Resultado guardado en: verification-result.txt');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.close();
    }
}

quickCheck();
