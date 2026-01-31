import { tursoClient } from './client.js';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script de prueba completa del sistema de conversión de unidades
 * Simula el flujo completo: crear producto, unidades, compra y venta
 */

async function testUnitConversionSystem() {
    console.log('🧪 PRUEBA COMPLETA: Sistema de Conversión de Unidades\n');
    console.log('='.repeat(60) + '\n');

    try {
        const now = new Date().toISOString();

        // ============================================
        // 1. CREAR PRODUCTO: Aceite Vegetal
        // ============================================
        console.log('📦 PASO 1: Crear Producto\n');

        const productId = `PROD-${randomUUID()}`;
        await tursoClient.execute({
            sql: `INSERT INTO products (
                id, name, description, sku, category, category_id,
                cost_price, retail_price, wholesale_price, unit, is_active, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                productId,
                'Aceite Vegetal',
                'Aceite vegetal para cocina',
                'ACEITE-001',
                'Líquidos',
                null,
                3000,  // C$ 30.00 por litro (costo)
                4000,  // C$ 40.00 por litro (precio menudeo)
                3500,  // C$ 35.00 por litro (precio mayoreo)
                'L',   // Unidad base: litro
                1,
                now,
                now
            ]
        });

        console.log(`✅ Producto creado: ${productId}`);
        console.log(`   Nombre: Aceite Vegetal`);
        console.log(`   Unidad base: Litro (L)`);
        console.log(`   Costo: C$ 30.00/L\n`);

        // ============================================
        // 2. CREAR UNIDADES DE CONVERSIÓN
        // ============================================
        console.log('📊 PASO 2: Crear Unidades de Conversión\n');

        const units = [
            {
                id: `UNIT-${randomUUID()}`,
                unitName: 'Litro',
                unitSymbol: 'L',
                conversionFactor: 1,
                unitType: 'BASE',
                salesType: 'RETAIL',
                retailPrice: 4000,
                wholesalePrice: null
            },
            {
                id: `UNIT-${randomUUID()}`,
                unitName: 'Galón',
                unitSymbol: 'gal',
                conversionFactor: 3.785,  // 1 galón = 3.785 litros
                unitType: 'PURCHASE',
                salesType: 'BOTH',
                retailPrice: 15000,    // C$ 150.00 (menudeo)
                wholesalePrice: 13000  // C$ 130.00 (mayoreo)
            },
            {
                id: `UNIT-${randomUUID()}`,
                unitName: 'Medio Galón',
                unitSymbol: '1/2 gal',
                conversionFactor: 1.8925,  // 1/2 galón = 1.8925 litros
                unitType: 'SALE',
                salesType: 'RETAIL',
                retailPrice: 7500,  // C$ 75.00
                wholesalePrice: null
            }
        ];

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
            console.log(`   Factor: ${unit.conversionFactor} L`);
            console.log(`   Tipo: ${unit.unitType} | Venta: ${unit.salesType}`);
            if (unit.retailPrice) {
                console.log(`   Precio menudeo: C$ ${(unit.retailPrice / 100).toFixed(2)}`);
            }
            if (unit.wholesalePrice) {
                console.log(`   Precio mayoreo: C$ ${(unit.wholesalePrice / 100).toFixed(2)}`);
            }
            console.log('');
        }

        // ============================================
        // 3. SIMULAR COMPRA: 50 galones
        // ============================================
        console.log('🛒 PASO 3: Simular Compra\n');

        const purchaseQuantity = 50;  // galones
        const galonUnit = units.find(u => u.unitSymbol === 'gal');
        const baseQuantityPurchase = purchaseQuantity * (galonUnit?.conversionFactor || 1);

        console.log(`📥 Compra: ${purchaseQuantity} galones`);
        console.log(`   → Conversión: ${baseQuantityPurchase.toFixed(2)} litros`);
        console.log(`   → Stock inicial: 0 L`);
        console.log(`   → Stock después de compra: ${baseQuantityPurchase.toFixed(2)} L\n`);

        // Crear stock inicial
        const branchId = 'BRANCH-001';  // Asumiendo que existe
        const stockId = `STOCK-${randomUUID()}`;

        await tursoClient.execute({
            sql: `INSERT INTO stock (id, product_id, branch_id, quantity, min_stock, max_stock, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [stockId, productId, branchId, baseQuantityPurchase, 10, 1000, now]
        });

        // ============================================
        // 4. SIMULAR VENTAS
        // ============================================
        console.log('💰 PASO 4: Simular Ventas\n');

        let currentStock = baseQuantityPurchase;

        // Venta 1: 10 litros al menudeo
        console.log('Venta 1: 10 litros (menudeo)');
        const sale1Quantity = 10;
        const sale1Price = 10 * 4000;
        currentStock -= sale1Quantity;
        console.log(`   Precio: C$ ${(sale1Price / 100).toFixed(2)}`);
        console.log(`   Stock descontado: ${sale1Quantity} L`);
        console.log(`   Stock restante: ${currentStock.toFixed(2)} L\n`);

        // Venta 2: 3 medios galones al menudeo
        console.log('Venta 2: 3 medios galones (menudeo)');
        const sale2Quantity = 3;
        const medioGalonUnit = units.find(u => u.unitSymbol === '1/2 gal');
        const sale2BaseQuantity = sale2Quantity * (medioGalonUnit?.conversionFactor || 1);
        const sale2Price = 3 * 7500;
        currentStock -= sale2BaseQuantity;
        console.log(`   Precio: C$ ${(sale2Price / 100).toFixed(2)}`);
        console.log(`   Conversión: ${sale2BaseQuantity.toFixed(2)} L`);
        console.log(`   Stock descontado: ${sale2BaseQuantity.toFixed(2)} L`);
        console.log(`   Stock restante: ${currentStock.toFixed(2)} L\n`);

        // Venta 3: 10 galones al mayoreo
        console.log('Venta 3: 10 galones (mayoreo)');
        const sale3Quantity = 10;
        const sale3BaseQuantity = sale3Quantity * (galonUnit?.conversionFactor || 1);
        const sale3Price = 10 * 13000;
        currentStock -= sale3BaseQuantity;
        console.log(`   Precio: C$ ${(sale3Price / 100).toFixed(2)}`);
        console.log(`   Conversión: ${sale3BaseQuantity.toFixed(2)} L`);
        console.log(`   Stock descontado: ${sale3BaseQuantity.toFixed(2)} L`);
        console.log(`   Stock restante: ${currentStock.toFixed(2)} L\n`);

        // ============================================
        // 5. RESUMEN FINAL
        // ============================================
        console.log('='.repeat(60));
        console.log('📊 RESUMEN FINAL\n');

        console.log('Compras:');
        console.log(`  - 50 galones = ${baseQuantityPurchase.toFixed(2)} L\n`);

        console.log('Ventas:');
        console.log(`  - 10 litros (menudeo) = C$ ${(sale1Price / 100).toFixed(2)}`);
        console.log(`  - 3 medios galones (menudeo) = C$ ${(sale2Price / 100).toFixed(2)}`);
        console.log(`  - 10 galones (mayoreo) = C$ ${(sale3Price / 100).toFixed(2)}`);
        const totalSales = sale1Price + sale2Price + sale3Price;
        console.log(`  TOTAL VENTAS: C$ ${(totalSales / 100).toFixed(2)}\n`);

        console.log('Stock:');
        console.log(`  - Inicial: ${baseQuantityPurchase.toFixed(2)} L`);
        console.log(`  - Vendido: ${(baseQuantityPurchase - currentStock).toFixed(2)} L`);
        console.log(`  - Restante: ${currentStock.toFixed(2)} L\n`);

        // Actualizar stock en BD
        await tursoClient.execute({
            sql: 'UPDATE stock SET quantity = ?, updated_at = ? WHERE id = ?',
            args: [currentStock, now, stockId]
        });

        // Verificar stock en BD
        const stockCheck = await tursoClient.execute({
            sql: 'SELECT * FROM stock WHERE id = ?',
            args: [stockId]
        });

        console.log('✅ Stock verificado en base de datos:');
        console.log(`   Cantidad: ${Number(stockCheck.rows[0].quantity).toFixed(2)} L\n`);

        console.log('='.repeat(60));
        console.log('🎉 PRUEBA COMPLETADA EXITOSAMENTE\n');
        console.log(`📌 ID del producto: ${productId}`);
        console.log(`📌 ID del stock: ${stockId}\n`);

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
        process.exit(1);
    } finally {
        tursoClient.close();
    }
}

testUnitConversionSystem();
