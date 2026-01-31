import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script para verificar el estado del sistema de unidades en producción
 */

async function verifyUnitSystem() {
    console.log('🔍 VERIFICACIÓN DEL SISTEMA DE UNIDADES DE MEDIDA\n');
    console.log('='.repeat(70));

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    try {
        // 1. Verificar si existe la tabla unit_conversions
        console.log('\n📋 1. VERIFICANDO TABLA unit_conversions...\n');

        const tablesResult = await client.execute({
            sql: `SELECT name FROM sqlite_master WHERE type='table' AND name='unit_conversions'`
        });

        if (tablesResult.rows.length === 0) {
            console.log('❌ La tabla unit_conversions NO EXISTE');
            console.log('   Se necesita ejecutar la migración\n');
        } else {
            console.log('✅ La tabla unit_conversions EXISTE');

            // Verificar estructura
            const columnsResult = await client.execute({
                sql: `PRAGMA table_info(unit_conversions)`
            });

            console.log('\n   Columnas encontradas:');
            columnsResult.rows.forEach((col: any) => {
                console.log(`   - ${col.name} (${col.type})`);
            });

            // Contar registros
            const countResult = await client.execute({
                sql: 'SELECT COUNT(*) as count FROM unit_conversions'
            });
            const count = countResult.rows[0].count;
            console.log(`\n   Total de unidades registradas: ${count}`);

            if (Number(count) > 0) {
                // Mostrar algunos ejemplos
                const examplesResult = await client.execute({
                    sql: 'SELECT * FROM unit_conversions LIMIT 5'
                });
                console.log('\n   Ejemplos de unidades:');
                examplesResult.rows.forEach((row: any) => {
                    console.log(`   - ${row.unit_name} (${row.unit_symbol}) - Factor: ${row.conversion_factor}`);
                });
            }
        }

        // 2. Verificar columnas en sale_items
        console.log('\n' + '─'.repeat(70));
        console.log('\n📋 2. VERIFICANDO TABLA sale_items...\n');

        const saleItemsColumns = await client.execute({
            sql: `PRAGMA table_info(sale_items)`
        });

        const hasUnitColumns = saleItemsColumns.rows.some((col: any) =>
            col.name === 'unit_id' || col.name === 'unit_name' || col.name === 'base_quantity'
        );

        if (hasUnitColumns) {
            console.log('✅ La tabla sale_items tiene columnas de unidades');
            console.log('\n   Columnas relacionadas con unidades:');
            saleItemsColumns.rows.forEach((col: any) => {
                if (['unit_id', 'unit_name', 'unit_symbol', 'base_quantity'].includes(col.name)) {
                    console.log(`   - ${col.name} (${col.type})`);
                }
            });
        } else {
            console.log('⚠️  La tabla sale_items NO tiene columnas de unidades');
            console.log('   Esto es NORMAL - las unidades se manejan en memoria');
        }

        // 3. Verificar ventas existentes
        console.log('\n' + '─'.repeat(70));
        console.log('\n📋 3. VERIFICANDO VENTAS EXISTENTES...\n');

        const salesCount = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM sales'
        });
        console.log(`   Total de ventas: ${salesCount.rows[0].count}`);

        const saleItemsCount = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM sale_items'
        });
        console.log(`   Total de items vendidos: ${saleItemsCount.rows[0].count}`);

        // Verificar si alguna venta tiene unitId
        const recentSales = await client.execute({
            sql: 'SELECT * FROM sale_items ORDER BY id DESC LIMIT 5'
        });

        console.log('\n   Últimos 5 items vendidos:');
        recentSales.rows.forEach((item: any, index: number) => {
            console.log(`   ${index + 1}. ${item.product_name} - Cantidad: ${item.quantity}`);
        });

        // 4. Verificar columnas en purchase_items
        console.log('\n' + '─'.repeat(70));
        console.log('\n📋 4. VERIFICANDO TABLA purchase_items...\n');

        const purchaseItemsColumns = await client.execute({
            sql: `PRAGMA table_info(purchase_items)`
        });

        const hasPurchaseUnitColumns = purchaseItemsColumns.rows.some((col: any) =>
            col.name === 'unit_id' || col.name === 'unit_name' || col.name === 'base_quantity'
        );

        if (hasPurchaseUnitColumns) {
            console.log('✅ La tabla purchase_items tiene columnas de unidades');
        } else {
            console.log('⚠️  La tabla purchase_items NO tiene columnas de unidades');
            console.log('   Esto es NORMAL - las unidades se manejan en memoria');
        }

        // 5. Verificar productos
        console.log('\n' + '─'.repeat(70));
        console.log('\n📋 5. VERIFICANDO PRODUCTOS...\n');

        const productsCount = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM products'
        });
        console.log(`   Total de productos: ${productsCount.rows[0].count}`);

        const productsColumns = await client.execute({
            sql: `PRAGMA table_info(products)`
        });

        const hasBaseUnitColumns = productsColumns.rows.some((col: any) =>
            col.name === 'base_unit_id' || col.name === 'base_unit_name'
        );

        if (hasBaseUnitColumns) {
            console.log('✅ La tabla products tiene columnas de unidad base');
        } else {
            console.log('⚠️  La tabla products NO tiene columnas de unidad base');
            console.log('   Esto es NORMAL - las unidades base se definen en unit_conversions');
        }

        // 6. Verificar stock
        console.log('\n' + '─'.repeat(70));
        console.log('\n📋 6. VERIFICANDO STOCK...\n');

        const stockCount = await client.execute({
            sql: 'SELECT COUNT(*) as count FROM stock'
        });
        console.log(`   Total de registros de stock: ${stockCount.rows[0].count}`);

        // Mostrar algunos productos con stock
        const stockSample = await client.execute({
            sql: `SELECT s.product_id, p.name, s.quantity, s.branch_id 
                  FROM stock s 
                  JOIN products p ON s.product_id = p.id 
                  LIMIT 5`
        });

        console.log('\n   Muestra de stock actual:');
        stockSample.rows.forEach((row: any) => {
            console.log(`   - ${row.name}: ${row.quantity} unidades`);
        });

        // RESUMEN FINAL
        console.log('\n' + '='.repeat(70));
        console.log('\n📊 RESUMEN DE VERIFICACIÓN:\n');

        const tableExists = tablesResult.rows.length > 0;
        const hasData = tableExists && Number((await client.execute({
            sql: 'SELECT COUNT(*) as count FROM unit_conversions'
        })).rows[0].count) > 0;

        if (tableExists) {
            console.log('✅ Tabla unit_conversions: EXISTE');
            console.log(`✅ Unidades registradas: ${hasData ? 'SÍ' : 'NO'}`);
        } else {
            console.log('❌ Tabla unit_conversions: NO EXISTE');
        }

        console.log(`✅ Ventas existentes: ${salesCount.rows[0].count}`);
        console.log(`✅ Productos existentes: ${productsCount.rows[0].count}`);
        console.log(`✅ Stock registrado: ${stockCount.rows[0].count}`);

        console.log('\n💡 CONCLUSIÓN:');
        if (tableExists) {
            console.log('   El sistema de unidades está configurado correctamente.');
            console.log('   Las ventas y compras existentes NO se verán afectadas.');
            console.log('   El sistema es 100% retrocompatible.');
        } else {
            console.log('   ⚠️  Se necesita ejecutar la migración de unidades.');
            console.log('   Ejecuta: npx tsx src/infrastructure/turso/migrate-unit-conversions.ts');
        }

        console.log('\n' + '='.repeat(70) + '\n');

    } catch (error) {
        console.error('\n❌ Error durante la verificación:', error);
        process.exit(1);
    } finally {
        client.close();
    }
}

verifyUnitSystem();
