import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script para crear unidades de conversión para productos de repostería
 * Basado en prácticas comunes de la industria
 */

interface UnitConversion {
    productId: string;
    productName: string;
    unitName: string;
    unitSymbol: string;
    conversionFactor: number;
    unitType: 'BASE' | 'PURCHASE' | 'SALE';
    salesType: 'RETAIL' | 'WHOLESALE' | 'BOTH';
    retailPrice?: number;
    wholesalePrice?: number;
}

async function createUnitsForProducts() {
    console.log('🔧 CREANDO UNIDADES DE CONVERSIÓN PARA PRODUCTOS\n');
    console.log('='.repeat(70));

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    try {
        // Obtener todos los productos
        const productsResult = await client.execute({
            sql: 'SELECT * FROM products ORDER BY name'
        });

        const unitsToCreate: UnitConversion[] = [];

        for (const product of productsResult.rows) {
            const productId = product.id as string;
            const productName = product.name as string;
            const retailPrice = Number(product.retail_price);
            const wholesalePrice = Number(product.wholesale_price);

            console.log(`\n📦 ${productName}`);
            console.log('─'.repeat(50));

            // Determinar unidades según el tipo de producto
            if (productName.toLowerCase().includes('harina')) {
                // HARINA: Se compra en quintales, se vende en libras o quintales
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Libra',
                    unitSymbol: 'lb',
                    conversionFactor: 1,
                    unitType: 'BASE',
                    salesType: 'RETAIL',
                    retailPrice: Math.round(retailPrice / 100) // Precio por libra
                });
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Quintal',
                    unitSymbol: 'qq',
                    conversionFactor: 100,
                    unitType: 'PURCHASE',
                    salesType: 'WHOLESALE',
                    wholesalePrice: Math.round(wholesalePrice * 100) // Precio por quintal
                });
                console.log('  ✅ Libra (BASE) - Factor: 1');
                console.log('  ✅ Quintal (COMPRA) - Factor: 100');

            } else if (productName.toLowerCase().includes('margarina') && productName.toLowerCase().includes('caja')) {
                // MARGARINA EN CAJA: Se vende por caja o por unidad (barra)
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Unidad',
                    unitSymbol: 'u',
                    conversionFactor: 1,
                    unitType: 'BASE',
                    salesType: 'RETAIL',
                    retailPrice: Math.round(retailPrice / 24) // Precio por unidad (asumiendo 24 por caja)
                });
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Caja',
                    unitSymbol: 'cja',
                    conversionFactor: 24,
                    unitType: 'PURCHASE',
                    salesType: 'WHOLESALE',
                    wholesalePrice: wholesalePrice
                });
                console.log('  ✅ Unidad (BASE) - Factor: 1');
                console.log('  ✅ Caja (COMPRA) - Factor: 24');

            } else if (productName.toLowerCase().includes('aceite') && productName.toLowerCase().includes('spray')) {
                // ACEITE SPRAY: Se vende por unidad o por caja
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Unidad',
                    unitSymbol: 'u',
                    conversionFactor: 1,
                    unitType: 'BASE',
                    salesType: 'RETAIL',
                    retailPrice: retailPrice
                });
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Caja',
                    unitSymbol: 'cja',
                    conversionFactor: 12,
                    unitType: 'PURCHASE',
                    salesType: 'WHOLESALE',
                    wholesalePrice: Math.round(wholesalePrice * 12)
                });
                console.log('  ✅ Unidad (BASE) - Factor: 1');
                console.log('  ✅ Caja (COMPRA) - Factor: 12');

            } else if (productName.toLowerCase().includes('chocolate') || productName.toLowerCase().includes('cobertura')) {
                // CHOCOLATE/COBERTURA: Se vende por libra o por caja
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Libra',
                    unitSymbol: 'lb',
                    conversionFactor: 1,
                    unitType: 'BASE',
                    salesType: 'RETAIL',
                    retailPrice: retailPrice
                });
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Caja',
                    unitSymbol: 'cja',
                    conversionFactor: 10,
                    unitType: 'PURCHASE',
                    salesType: 'WHOLESALE',
                    wholesalePrice: Math.round(wholesalePrice * 10)
                });
                console.log('  ✅ Libra (BASE) - Factor: 1');
                console.log('  ✅ Caja (COMPRA) - Factor: 10 lb');

            } else if (productName.toLowerCase().includes('cocoa') || productName.toLowerCase().includes('polvo')) {
                // COCOA/POLVO: Se vende por libra o por caja
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Libra',
                    unitSymbol: 'lb',
                    conversionFactor: 1,
                    unitType: 'BASE',
                    salesType: 'RETAIL',
                    retailPrice: retailPrice
                });
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Caja',
                    unitSymbol: 'cja',
                    conversionFactor: 25,
                    unitType: 'PURCHASE',
                    salesType: 'WHOLESALE',
                    wholesalePrice: Math.round(wholesalePrice * 25)
                });
                console.log('  ✅ Libra (BASE) - Factor: 1');
                console.log('  ✅ Caja (COMPRA) - Factor: 25 lb');

            } else if (productName.toLowerCase().includes('crema') || productName.toLowerCase().includes('chantilly')) {
                // CREMA: Se vende por litro o por caja
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Litro',
                    unitSymbol: 'L',
                    conversionFactor: 1,
                    unitType: 'BASE',
                    salesType: 'RETAIL',
                    retailPrice: retailPrice
                });
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Caja',
                    unitSymbol: 'cja',
                    conversionFactor: 12,
                    unitType: 'PURCHASE',
                    salesType: 'WHOLESALE',
                    wholesalePrice: Math.round(wholesalePrice * 12)
                });
                console.log('  ✅ Litro (BASE) - Factor: 1');
                console.log('  ✅ Caja (COMPRA) - Factor: 12 L');

            } else if (productName.toLowerCase().includes('dulce de leche')) {
                // DULCE DE LECHE: Se vende por kilogramo o por caja
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Kilogramo',
                    unitSymbol: 'kg',
                    conversionFactor: 1,
                    unitType: 'BASE',
                    salesType: 'RETAIL',
                    retailPrice: retailPrice
                });
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Caja',
                    unitSymbol: 'cja',
                    conversionFactor: 12,
                    unitType: 'PURCHASE',
                    salesType: 'WHOLESALE',
                    wholesalePrice: Math.round(wholesalePrice * 12)
                });
                console.log('  ✅ Kilogramo (BASE) - Factor: 1');
                console.log('  ✅ Caja (COMPRA) - Factor: 12 kg');

            } else {
                // OTROS: Unidad simple
                unitsToCreate.push({
                    productId,
                    productName,
                    unitName: 'Unidad',
                    unitSymbol: 'u',
                    conversionFactor: 1,
                    unitType: 'BASE',
                    salesType: 'BOTH',
                    retailPrice: retailPrice,
                    wholesalePrice: wholesalePrice
                });
                console.log('  ✅ Unidad (BASE) - Factor: 1');
            }
        }

        // Insertar todas las unidades
        console.log('\n' + '='.repeat(70));
        console.log(`\n💾 Insertando ${unitsToCreate.length} unidades en la base de datos...\n`);

        let inserted = 0;
        for (const unit of unitsToCreate) {
            const id = `UNIT-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const now = new Date().toISOString();

            await client.execute({
                sql: `INSERT INTO unit_conversions 
                      (id, product_id, unit_name, unit_symbol, conversion_factor, unit_type, 
                       retail_price, wholesale_price, sales_type, is_active, created_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    id,
                    unit.productId,
                    unit.unitName,
                    unit.unitSymbol,
                    unit.conversionFactor,
                    unit.unitType,
                    unit.retailPrice || null,
                    unit.wholesalePrice || null,
                    unit.salesType,
                    1,
                    now
                ]
            });

            inserted++;
            console.log(`  ✅ ${unit.productName} - ${unit.unitName} (${unit.unitSymbol})`);
        }

        console.log(`\n🎉 ${inserted} unidades creadas exitosamente!\n`);

        // Verificar
        const verification = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM unit_conversions'
        });

        console.log('='.repeat(70));
        console.log(`\n📊 Total de unidades en la base de datos: ${verification.rows[0].count}\n`);

    } catch (error) {
        console.error('\n❌ Error:', error);
        process.exit(1);
    } finally {
        client.close();
    }
}

createUnitsForProducts();
