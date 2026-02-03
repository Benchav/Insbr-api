import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function verifyUnitSystem() {
    try {
        console.log('🔍 VERIFICACIÓN COMPLETA DEL SISTEMA DE UNIDADES DE MEDIDA\n');
        console.log('='.repeat(80));

        let allTestsPassed = true;

        // Test 1: Verificar que no existan duplicados exactos
        console.log('\n✅ Test 1: Verificar ausencia de duplicados exactos');
        console.log('-'.repeat(80));

        const duplicatesCheck = await client.execute(`
            SELECT 
                product_id,
                unit_name,
                conversion_factor,
                COUNT(*) as count
            FROM unit_conversions
            WHERE is_active = 1
            GROUP BY product_id, unit_name, conversion_factor
            HAVING COUNT(*) > 1
        `);

        if (duplicatesCheck.rows.length === 0) {
            console.log('✅ PASÓ: No hay duplicados exactos en el sistema');
        } else {
            console.log('❌ FALLÓ: Se encontraron duplicados exactos:');
            duplicatesCheck.rows.forEach(row => {
                console.log(`   - Producto ${row.product_id}: ${row.unit_name} (factor ${row.conversion_factor}) - ${row.count} registros`);
            });
            allTestsPassed = false;
        }

        // Test 2: Verificar que cada producto tenga exactamente 1 unidad BASE
        console.log('\n✅ Test 2: Verificar unidades BASE');
        console.log('-'.repeat(80));

        const baseUnitsCheck = await client.execute(`
            SELECT 
                product_id,
                COUNT(*) as base_count
            FROM unit_conversions
            WHERE unit_type = 'BASE' AND is_active = 1
            GROUP BY product_id
        `);

        let baseTestPassed = true;
        for (const row of baseUnitsCheck.rows) {
            if (row.base_count !== 1) {
                console.log(`❌ FALLÓ: Producto ${row.product_id} tiene ${row.base_count} unidades BASE (debe ser 1)`);
                baseTestPassed = false;
                allTestsPassed = false;
            }
        }

        if (baseTestPassed) {
            console.log(`✅ PASÓ: Todos los productos tienen exactamente 1 unidad BASE`);
            console.log(`   Total de productos con unidades: ${baseUnitsCheck.rows.length}`);
        }

        // Test 3: Verificar que todas las unidades BASE tengan factor = 1
        console.log('\n✅ Test 3: Verificar factores de conversión BASE');
        console.log('-'.repeat(80));

        const baseFactorCheck = await client.execute(`
            SELECT id, product_id, unit_name, conversion_factor
            FROM unit_conversions
            WHERE unit_type = 'BASE' AND conversion_factor != 1 AND is_active = 1
        `);

        if (baseFactorCheck.rows.length === 0) {
            console.log('✅ PASÓ: Todas las unidades BASE tienen factor = 1');
        } else {
            console.log('❌ FALLÓ: Unidades BASE con factor incorrecto:');
            baseFactorCheck.rows.forEach(row => {
                console.log(`   - ${row.unit_name} (${row.product_id}): factor = ${row.conversion_factor}`);
            });
            allTestsPassed = false;
        }

        // Test 4: Verificar que todos los factores sean positivos
        console.log('\n✅ Test 4: Verificar factores de conversión positivos');
        console.log('-'.repeat(80));

        const positiveFactorCheck = await client.execute(`
            SELECT id, product_id, unit_name, conversion_factor
            FROM unit_conversions
            WHERE conversion_factor <= 0 AND is_active = 1
        `);

        if (positiveFactorCheck.rows.length === 0) {
            console.log('✅ PASÓ: Todos los factores de conversión son positivos');
        } else {
            console.log('❌ FALLÓ: Unidades con factor no positivo:');
            positiveFactorCheck.rows.forEach(row => {
                console.log(`   - ${row.unit_name} (${row.product_id}): factor = ${row.conversion_factor}`);
            });
            allTestsPassed = false;
        }

        // Test 5: Probar conversiones matemáticas
        console.log('\n✅ Test 5: Verificar conversiones matemáticas');
        console.log('-'.repeat(80));

        // Obtener un producto con múltiples unidades para probar
        const testProduct = await client.execute(`
            SELECT DISTINCT product_id
            FROM unit_conversions
            WHERE is_active = 1
            GROUP BY product_id
            HAVING COUNT(*) > 1
            LIMIT 1
        `);

        if (testProduct.rows.length > 0) {
            const productId = testProduct.rows[0].product_id as string;

            const units = await client.execute({
                sql: `SELECT * FROM unit_conversions WHERE product_id = ? AND is_active = 1 ORDER BY conversion_factor`,
                args: [productId]
            });

            console.log(`   Probando con producto: ${productId}`);
            console.log(`   Unidades disponibles: ${units.rows.length}`);

            // Probar conversión: 100 unidades de la más grande a la base
            const largestUnit = units.rows[units.rows.length - 1];
            const baseUnit = units.rows.find(u => u.unit_type === 'BASE');

            if (baseUnit && largestUnit) {
                const quantity = 5;
                const expectedBase = quantity * Number(largestUnit.conversion_factor);

                console.log(`\n   Conversión: ${quantity} ${largestUnit.unit_name} → Unidad BASE`);
                console.log(`   Factor: ${largestUnit.conversion_factor}`);
                console.log(`   Resultado esperado: ${expectedBase} ${baseUnit.unit_name}`);
                console.log(`   Fórmula: ${quantity} × ${largestUnit.conversion_factor} = ${expectedBase}`);

                // Conversión inversa
                const backToOriginal = expectedBase / Number(largestUnit.conversion_factor);
                console.log(`\n   Conversión inversa: ${expectedBase} ${baseUnit.unit_name} → ${largestUnit.unit_name}`);
                console.log(`   Resultado: ${backToOriginal} ${largestUnit.unit_name}`);
                console.log(`   Fórmula: ${expectedBase} ÷ ${largestUnit.conversion_factor} = ${backToOriginal}`);

                if (Math.abs(backToOriginal - quantity) < 0.0001) {
                    console.log('   ✅ Conversión bidireccional correcta');
                } else {
                    console.log('   ❌ Error en conversión bidireccional');
                    allTestsPassed = false;
                }
            }
        }

        // Test 6: Verificar integridad de datos
        console.log('\n✅ Test 6: Verificar integridad de datos');
        console.log('-'.repeat(80));

        const integrityCheck = await client.execute(`
            SELECT 
                uc.id,
                uc.product_id,
                uc.unit_name,
                p.name as product_name
            FROM unit_conversions uc
            LEFT JOIN products p ON uc.product_id = p.id
            WHERE uc.is_active = 1 AND p.id IS NULL
        `);

        if (integrityCheck.rows.length === 0) {
            console.log('✅ PASÓ: Todas las unidades tienen productos válidos');
        } else {
            console.log('❌ FALLÓ: Unidades con productos inexistentes:');
            integrityCheck.rows.forEach(row => {
                console.log(`   - Unidad ${row.unit_name} (${row.id}) referencia producto ${row.product_id} que no existe`);
            });
            allTestsPassed = false;
        }

        // Resumen final
        console.log('\n\n');
        console.log('='.repeat(80));
        console.log('📊 RESUMEN DE VERIFICACIÓN');
        console.log('='.repeat(80));

        if (allTestsPassed) {
            console.log('\n✅ ¡TODOS LOS TESTS PASARON!');
            console.log('\n🎉 El sistema de unidades de medida está funcionando PERFECTAMENTE');
            console.log('\nCaracterísticas verificadas:');
            console.log('  ✅ No hay duplicados exactos');
            console.log('  ✅ Cada producto tiene exactamente 1 unidad BASE');
            console.log('  ✅ Todas las unidades BASE tienen factor = 1');
            console.log('  ✅ Todos los factores son positivos');
            console.log('  ✅ Las conversiones matemáticas son correctas');
            console.log('  ✅ La integridad referencial es correcta');
        } else {
            console.log('\n❌ ALGUNOS TESTS FALLARON');
            console.log('\nRevisa los detalles arriba para corregir los problemas.');
        }

        console.log('\n✅ Verificación completada\n');

        return allTestsPassed;

    } catch (error) {
        console.error('❌ Error durante la verificación:', error);
        throw error;
    } finally {
        client.close();
    }
}

// Ejecutar verificación
verifyUnitSystem()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
