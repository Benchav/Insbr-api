import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function analyzeProducts() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    const results: string[] = [];

    try {
        results.push('=== ANÁLISIS DE PRODUCTOS Y CATEGORÍAS ===\n\n');

        // Obtener todas las categorías
        const categoriesResult = await client.execute({
            sql: 'SELECT * FROM categories ORDER BY name'
        });

        results.push(`📁 CATEGORÍAS ENCONTRADAS: ${categoriesResult.rows.length}\n`);
        results.push('─'.repeat(70) + '\n\n');

        for (const category of categoriesResult.rows) {
            results.push(`\n📂 Categoría: ${category.name}\n`);
            results.push(`   ID: ${category.id}\n`);
            if (category.description) {
                results.push(`   Descripción: ${category.description}\n`);
            }
            results.push('\n');

            // Obtener productos de esta categoría
            const productsResult = await client.execute({
                sql: 'SELECT * FROM products WHERE category_id = ? ORDER BY name',
                args: [category.id]
            });

            if (productsResult.rows.length > 0) {
                results.push(`   Productos (${productsResult.rows.length}):\n`);
                for (const product of productsResult.rows) {
                    results.push(`   ├─ ${product.name}\n`);
                    results.push(`   │  ID: ${product.id}\n`);
                    results.push(`   │  SKU: ${product.sku || 'N/A'}\n`);
                    results.push(`   │  Precio Menudeo: C$ ${(Number(product.retail_price) / 100).toFixed(2)}\n`);
                    results.push(`   │  Precio Mayoreo: C$ ${(Number(product.wholesale_price) / 100).toFixed(2)}\n`);

                    // Verificar si ya tiene unidades
                    const unitsResult = await client.execute({
                        sql: 'SELECT COUNT(*) as count FROM unit_conversions WHERE product_id = ?',
                        args: [product.id]
                    });
                    const hasUnits = Number(unitsResult.rows[0].count) > 0;
                    results.push(`   │  Unidades: ${hasUnits ? '✅ Ya tiene' : '❌ Sin unidades'}\n`);
                    results.push(`   │\n`);
                }
            } else {
                results.push(`   (Sin productos)\n`);
            }
            results.push('\n');
        }

        // Productos sin categoría
        const uncategorizedResult = await client.execute({
            sql: 'SELECT * FROM products WHERE category_id IS NULL OR category_id = "" ORDER BY name'
        });

        if (uncategorizedResult.rows.length > 0) {
            results.push('\n📂 SIN CATEGORÍA\n\n');
            for (const product of uncategorizedResult.rows) {
                results.push(`   ├─ ${product.name}\n`);
                results.push(`   │  ID: ${product.id}\n`);
                results.push(`   │  SKU: ${product.sku || 'N/A'}\n`);
                results.push(`   │\n`);
            }
        }

        // Resumen
        const totalProducts = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM products'
        });

        results.push('\n' + '='.repeat(70) + '\n');
        results.push('\n📊 RESUMEN\n\n');
        results.push(`Total de categorías: ${categoriesResult.rows.length}\n`);
        results.push(`Total de productos: ${totalProducts.rows[0].count}\n`);
        results.push(`Productos con unidades: 0\n`);
        results.push(`Productos sin unidades: ${totalProducts.rows[0].count}\n`);

        const output = results.join('');
        console.log(output);

        // Guardar en archivo
        fs.writeFileSync('products-analysis.txt', output);
        console.log('\n📄 Análisis guardado en: products-analysis.txt');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.close();
    }
}

analyzeProducts();
