import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script INTELIGENTE para actualizar precios y stock a unidades base
 */

async function updatePricesAndStock() {
    console.log('🔄 ACTUALIZANDO PRECIOS Y STOCK A UNIDADES BASE\n');
    console.log('='.repeat(70));

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    try {
        // Obtener productos con sus unidades
        const productsResult = await client.execute({
            sql: 'SELECT * FROM products'
        });

        for (const product of productsResult.rows) {
            const productId = product.id as string;
            const currentPrice = Number(product.retail_price);

            // Obtener unidades de este producto
            const unitsResult = await client.execute({
                sql: 'SELECT * FROM unit_conversions WHERE product_id = ?',
                args: [productId]
            });

            if (unitsResult.rows.length === 0) continue;

            const baseUnit = unitsResult.rows.find(u => u.unit_type === 'BASE');
            const purchaseUnit = unitsResult.rows.find(u => u.unit_type === 'PURCHASE');

            if (!baseUnit || !purchaseUnit) continue;

            const basePrice = Number(baseUnit.retail_price || 0);
            const purchasePrice = Number(purchaseUnit.wholesale_price || 0); // Usamos precio mayoreo para comparar bulto
            const factor = Number(purchaseUnit.conversion_factor);

            console.log(`\n📦 ${product.name}`);
            console.log(`   Precio Actual: C$ ${currentPrice / 100}`);
            console.log(`   Ref Base (${baseUnit.unit_name}): C$ ${basePrice / 100}`);
            console.log(`   Ref Bulto (${purchaseUnit.unit_name}): C$ ${purchasePrice / 100}`);

            // Determinar si necesita conversión
            // Si el precio actual es mayor al doble del precio base, asumimos que está en bulto
            const isBulk = currentPrice > (basePrice * 2);

            if (isBulk) {
                console.log('   ⚠️  DETECTADO COMO BULTO - SE REQUIERE CONVERSIÓN');
                console.log(`   Factor de conversión: ${factor} (${purchaseUnit.unit_name} -> ${baseUnit.unit_name})`);

                // 1. Actualizar Stock
                const stockResult = await client.execute({
                    sql: 'SELECT * FROM stock WHERE product_id = ?',
                    args: [productId]
                });

                for (const stock of stockResult.rows) {
                    const currentQty = Number(stock.quantity);
                    const newQty = currentQty * factor;

                    console.log(`   🔄 Stock ${stock.branch_id}: ${currentQty} -> ${newQty} ${baseUnit.unit_name}`);

                    await client.execute({
                        sql: 'UPDATE stock SET quantity = ? WHERE id = ?',
                        args: [newQty, stock.id]
                    });
                }

                // 2. Actualizar Producto (Precio)
                console.log(`   💰 Actualizando precio producto: C$ ${currentPrice / 100} -> C$ ${basePrice / 100}`);

                await client.execute({
                    sql: `UPDATE products SET 
                          retail_price = ?, 
                          wholesale_price = ? 
                          WHERE id = ?`,
                    args: [
                        baseUnit.retail_price,
                        baseUnit.wholesale_price || baseUnit.retail_price,
                        productId
                    ]
                });

                console.log('   ✅ Conversión completada');

            } else {
                console.log('   ✅ YA ESTÁ EN UNIDAD BASE - No se requieren cambios');
            }
        }

        console.log('\n' + '='.repeat(70));
        console.log('🎉 Actualización finalizada exitosamente');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        client.close();
    }
}

updatePricesAndStock();
