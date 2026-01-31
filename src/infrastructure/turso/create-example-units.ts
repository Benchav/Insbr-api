import { tursoClient } from './client.js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script para crear datos de ejemplo de conversión de unidades
 * Crea un producto "Harina de Trigo" con sus unidades de conversión
 */

async function createExampleUnitConversions() {
    console.log('🌾 Creando ejemplo: Harina de Trigo con conversiones de unidades...\n');

    try {
        // 1. Crear producto de ejemplo: Harina
        const productId = `PROD-${randomUUID()}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO products (
                id, name, description, sku, category, category_id,
                cost_price, retail_price, wholesale_price, unit, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                productId,
                'Harina de Trigo',
                'Harina de trigo para panificación',
                'HARINA-001',
                'Granos',
                null,
                1500,  // C$ 15.00 por libra (costo)
                2000,  // C$ 20.00 por libra (precio menudeo)
                1800,  // C$ 18.00 por libra (precio mayoreo)
                'lb',  // Unidad base: libra
                1,
                now,
                now
            ]
        });

        console.log(`✅ Producto creado: ${productId}`);
        console.log(`   - Nombre: Harina de Trigo`);
        console.log(`   - Unidad base: libra (lb)`);
        console.log(`   - Costo: C$ 15.00/lb`);
        console.log(`   - Precio menudeo: C$ 20.00/lb`);
        console.log(`   - Precio mayoreo: C$ 18.00/lb\n`);

        // 2. Crear unidades de conversión
        const units = [
            {
                id: `UNIT-${randomUUID()}`,
                unitName: 'Libra',
                unitSymbol: 'lb',
                conversionFactor: 1,
                unitType: 'BASE',
                salesType: 'RETAIL',
                retailPrice: 2000,  // C$ 20.00
                wholesalePrice: null
            },
            {
                id: `UNIT-${randomUUID()}`,
                unitName: 'Medio Quintal',
                unitSymbol: '1/2 qq',
                conversionFactor: 50,
                unitType: 'SALE',
                salesType: 'RETAIL',
                retailPrice: 95000,  // C$ 950.00 (descuento)
                wholesalePrice: null
            },
            {
                id: `UNIT-${randomUUID()}`,
                unitName: 'Quintal',
                unitSymbol: 'qq',
                conversionFactor: 100,
                unitType: 'PURCHASE',
                salesType: 'BOTH',
                retailPrice: 195000,   // C$ 1,950.00 (menudeo)
                wholesalePrice: 175000  // C$ 1,750.00 (mayoreo)
            }
        ];

        console.log('📊 Creando unidades de conversión:\n');

        for (const unit of units) {
            await tursoClient.execute({
                sql: `INSERT INTO unit_conversions (
                    id, product_id, unit_name, unit_symbol, conversion_factor, unit_type,
                    retail_price, wholesale_price, sales_type, is_active, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    unit.id,
                    productId,
                    unit.unitName,
                    unit.unitSymbol,
                    unit.conversionFactor,
                    unit.unitType,
                    unit.retailPrice,
                    unit.wholesalePrice,
                    unit.salesType,
                    1,
                    now
                ]
            });

            console.log(`✅ ${unit.unitName} (${unit.unitSymbol})`);
            console.log(`   - Factor de conversión: ${unit.conversionFactor} lb`);
            console.log(`   - Tipo: ${unit.unitType}`);
            console.log(`   - Venta: ${unit.salesType}`);
            if (unit.retailPrice) {
                console.log(`   - Precio menudeo: C$ ${(unit.retailPrice / 100).toFixed(2)}`);
            }
            if (unit.wholesalePrice) {
                console.log(`   - Precio mayoreo: C$ ${(unit.wholesalePrice / 100).toFixed(2)}`);
            }
            console.log('');
        }

        // 3. Verificar datos creados
        console.log('🔍 Verificando datos creados...\n');

        const product = await tursoClient.execute({
            sql: 'SELECT * FROM products WHERE id = ?',
            args: [productId]
        });

        const conversions = await tursoClient.execute({
            sql: 'SELECT * FROM unit_conversions WHERE product_id = ? ORDER BY conversion_factor ASC',
            args: [productId]
        });

        console.log(`✅ Producto encontrado: ${product.rows[0].name}`);
        console.log(`✅ ${conversions.rows.length} unidades de conversión creadas\n`);

        // 4. Mostrar ejemplos de uso
        console.log('📝 Ejemplos de uso:\n');
        console.log('1. COMPRA: 30 quintales');
        console.log(`   → Stock: ${30 * 100} libras\n`);

        console.log('2. VENTA AL MENUDEO: 20 libras');
        console.log(`   → Precio: C$ ${(20 * 2000 / 100).toFixed(2)}`);
        console.log(`   → Stock descontado: 20 libras\n`);

        console.log('3. VENTA AL MENUDEO: 1 medio quintal');
        console.log(`   → Precio: C$ ${(95000 / 100).toFixed(2)}`);
        console.log(`   → Stock descontado: 50 libras\n`);

        console.log('4. VENTA AL MAYOREO: 5 quintales');
        console.log(`   → Precio: C$ ${(5 * 175000 / 100).toFixed(2)}`);
        console.log(`   → Stock descontado: 500 libras\n`);

        console.log('🎉 ¡Datos de ejemplo creados exitosamente!\n');
        console.log(`📌 ID del producto: ${productId}`);
        console.log('📌 Puedes usar este ID para probar los endpoints de la API\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        tursoClient.close();
    }
}

createExampleUnitConversions();
