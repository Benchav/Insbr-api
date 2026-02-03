import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function analyzeUnits() {
    try {
        console.log('🔍 Analizando unidades de medida en la base de datos...\n');

        // Consultar todas las unidades
        const result = await client.execute(`
            SELECT 
                id,
                product_id,
                unit_name,
                unit_symbol,
                conversion_factor,
                unit_type,
                retail_price,
                wholesale_price,
                sales_type,
                is_active
            FROM unit_conversions
            ORDER BY unit_name, unit_type, conversion_factor
        `);

        console.log(`📊 Total de unidades encontradas: ${result.rows.length}\n`);

        // Agrupar por nombre de unidad para detectar duplicados
        const unitsByName = new Map<string, any[]>();

        for (const row of result.rows) {
            const unitName = row.unit_name as string;
            if (!unitsByName.has(unitName)) {
                unitsByName.set(unitName, []);
            }
            unitsByName.get(unitName)!.push(row);
        }

        // Mostrar duplicados
        console.log('🔴 UNIDADES DUPLICADAS (mismo nombre):\n');
        let hasDuplicates = false;

        for (const [unitName, units] of unitsByName.entries()) {
            if (units.length > 1) {
                hasDuplicates = true;
                console.log(`\n📌 "${unitName}" - ${units.length} registros:`);
                units.forEach((unit, index) => {
                    console.log(`   ${index + 1}. ID: ${unit.id}`);
                    console.log(`      - Símbolo: ${unit.unit_symbol}`);
                    console.log(`      - Factor: ${unit.conversion_factor}`);
                    console.log(`      - Tipo: ${unit.unit_type}`);
                    console.log(`      - Tipo Venta: ${unit.sales_type}`);
                    console.log(`      - Precio Retail: ${unit.retail_price || 'NULL'}`);
                    console.log(`      - Precio Mayoreo: ${unit.wholesale_price || 'NULL'}`);
                    console.log(`      - Activo: ${unit.is_active ? 'Sí' : 'No'}`);
                });
            }
        }

        if (!hasDuplicates) {
            console.log('   ✅ No se encontraron duplicados por nombre\n');
        }

        // Analizar unidades BASE
        console.log('\n\n📋 ANÁLISIS DE UNIDADES BASE:\n');
        const productsWithBase = new Map<string, any[]>();

        for (const row of result.rows) {
            if (row.unit_type === 'BASE') {
                const productId = row.product_id as string;
                if (!productsWithBase.has(productId)) {
                    productsWithBase.set(productId, []);
                }
                productsWithBase.get(productId)!.push(row);
            }
        }

        console.log(`Total de productos con unidad BASE: ${productsWithBase.size}\n`);

        // Productos con múltiples unidades BASE (ERROR)
        let hasMultipleBases = false;
        for (const [productId, baseUnits] of productsWithBase.entries()) {
            if (baseUnits.length > 1) {
                hasMultipleBases = true;
                console.log(`🔴 ERROR: Producto ${productId} tiene ${baseUnits.length} unidades BASE:`);
                baseUnits.forEach((unit, index) => {
                    console.log(`   ${index + 1}. ${unit.unit_name} (${unit.unit_symbol}) - Factor: ${unit.conversion_factor}`);
                });
            }
        }

        if (!hasMultipleBases) {
            console.log('✅ Todos los productos tienen máximo 1 unidad BASE\n');
        }

        // Verificar que las unidades BASE tengan factor = 1
        console.log('\n📋 VERIFICACIÓN DE FACTORES DE CONVERSIÓN BASE:\n');
        let hasInvalidBaseFactor = false;

        for (const row of result.rows) {
            if (row.unit_type === 'BASE' && row.conversion_factor !== 1) {
                hasInvalidBaseFactor = true;
                console.log(`🔴 ERROR: Unidad BASE "${row.unit_name}" tiene factor ${row.conversion_factor} (debería ser 1)`);
                console.log(`   ID: ${row.id}, Producto: ${row.product_id}`);
            }
        }

        if (!hasInvalidBaseFactor) {
            console.log('✅ Todas las unidades BASE tienen factor de conversión = 1\n');
        }

        // Resumen por tipo de unidad
        console.log('\n\n📊 RESUMEN POR TIPO DE UNIDAD:\n');
        const typeCount = new Map<string, number>();

        for (const row of result.rows) {
            const type = row.unit_type as string;
            typeCount.set(type, (typeCount.get(type) || 0) + 1);
        }

        for (const [type, count] of typeCount.entries()) {
            console.log(`   ${type}: ${count} unidades`);
        }

        // Mostrar todas las unidades únicas
        console.log('\n\n📋 LISTA DE UNIDADES ÚNICAS:\n');
        const uniqueUnits = Array.from(unitsByName.keys()).sort();
        uniqueUnits.forEach(unitName => {
            const units = unitsByName.get(unitName)!;
            const isDuplicate = units.length > 1 ? '🔴' : '✅';
            console.log(`${isDuplicate} ${unitName} (${units.length} registro${units.length > 1 ? 's' : ''})`);
        });

        console.log('\n✅ Análisis completado\n');

    } catch (error) {
        console.error('❌ Error al analizar unidades:', error);
        throw error;
    } finally {
        client.close();
    }
}

// Ejecutar análisis
analyzeUnits().catch(console.error);
