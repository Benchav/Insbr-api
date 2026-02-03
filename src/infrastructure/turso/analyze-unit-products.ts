import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function analyzeUnitProducts() {
    try {
        console.log('🔍 Análisis Detallado: Unidades y sus Productos\n');
        console.log('='.repeat(80));

        // Obtener todas las unidades con información del producto
        const result = await client.execute(`
            SELECT 
                uc.id as unit_id,
                uc.unit_name,
                uc.unit_symbol,
                uc.conversion_factor,
                uc.unit_type,
                uc.retail_price,
                uc.wholesale_price,
                uc.sales_type,
                uc.product_id,
                p.name as product_name,
                p.sku as product_sku
            FROM unit_conversions uc
            LEFT JOIN products p ON uc.product_id = p.id
            WHERE uc.is_active = 1
            ORDER BY uc.unit_name, uc.conversion_factor, p.name
        `);

        console.log(`\n📊 Total de unidades activas: ${result.rows.length}\n`);

        // Agrupar por nombre de unidad
        const unitsByName = new Map<string, any[]>();

        for (const row of result.rows) {
            const unitName = row.unit_name as string;
            if (!unitsByName.has(unitName)) {
                unitsByName.set(unitName, []);
            }
            unitsByName.get(unitName)!.push(row);
        }

        // Analizar cada grupo de unidades
        console.log('\n📋 ANÁLISIS POR NOMBRE DE UNIDAD:\n');
        console.log('='.repeat(80));

        for (const [unitName, units] of unitsByName.entries()) {
            const isDuplicate = units.length > 1;
            const icon = isDuplicate ? '🔴' : '✅';

            console.log(`\n${icon} ${unitName.toUpperCase()} - ${units.length} registro(s)`);
            console.log('-'.repeat(80));

            units.forEach((unit, index) => {
                console.log(`\n  ${index + 1}. Producto: ${unit.product_name || 'SIN NOMBRE'} (SKU: ${unit.product_sku || 'N/A'})`);
                console.log(`     ID Unidad: ${unit.unit_id}`);
                console.log(`     ID Producto: ${unit.product_id}`);
                console.log(`     Símbolo: ${unit.unit_symbol}`);
                console.log(`     Factor: ${unit.conversion_factor}`);
                console.log(`     Tipo: ${unit.unit_type}`);
                console.log(`     Tipo Venta: ${unit.sales_type}`);

                if (unit.retail_price) {
                    console.log(`     Precio Retail: C$${(Number(unit.retail_price) / 100).toFixed(2)}`);
                }
                if (unit.wholesale_price) {
                    console.log(`     Precio Mayoreo: C$${(Number(unit.wholesale_price) / 100).toFixed(2)}`);
                }
            });

            // Detectar duplicados exactos (mismo producto, mismo factor)
            if (isDuplicate) {
                const duplicateGroups = new Map<string, any[]>();

                for (const unit of units) {
                    const key = `${unit.product_id}-${unit.conversion_factor}`;
                    if (!duplicateGroups.has(key)) {
                        duplicateGroups.set(key, []);
                    }
                    duplicateGroups.get(key)!.push(unit);
                }

                for (const [key, group] of duplicateGroups.entries()) {
                    if (group.length > 1) {
                        console.log(`\n     ⚠️  DUPLICADO EXACTO DETECTADO (${group.length} registros):`);
                        group.forEach(u => {
                            console.log(`        - ID: ${u.unit_id}`);
                        });
                        console.log(`     ⚠️  Acción: Eliminar ${group.length - 1} registro(s)`);
                    }
                }
            }
        }

        // Resumen de acciones recomendadas
        console.log('\n\n');
        console.log('='.repeat(80));
        console.log('📝 RESUMEN DE ACCIONES RECOMENDADAS');
        console.log('='.repeat(80));

        let totalToDelete = 0;
        let totalToRename = 0;

        for (const [unitName, units] of unitsByName.entries()) {
            if (units.length > 1) {
                // Detectar duplicados exactos
                const duplicateGroups = new Map<string, any[]>();

                for (const unit of units) {
                    const key = `${unit.product_id}-${unit.conversion_factor}`;
                    if (!duplicateGroups.has(key)) {
                        duplicateGroups.set(key, []);
                    }
                    duplicateGroups.get(key)!.push(unit);
                }

                for (const [key, group] of duplicateGroups.entries()) {
                    if (group.length > 1) {
                        totalToDelete += (group.length - 1);
                    }
                }

                // Contar unidades que necesitan renombrarse
                const uniqueProducts = new Set(units.map(u => u.product_id));
                if (uniqueProducts.size === units.length) {
                    // Cada unidad es de un producto diferente, están bien
                } else {
                    // Hay unidades del mismo producto con el mismo nombre
                    totalToRename += units.length;
                }
            }
        }

        console.log(`\n1. 🗑️  Eliminar ${totalToDelete} registro(s) duplicado(s) exacto(s)`);
        console.log(`2. ✏️  Renombrar ${totalToRename} unidad(es) para hacerlas más descriptivas`);

        // Listar productos sin unidad BASE
        console.log('\n\n');
        console.log('='.repeat(80));
        console.log('⚠️  VERIFICACIÓN DE UNIDADES BASE');
        console.log('='.repeat(80));

        const productsWithBase = new Set<string>();
        const allProducts = new Set<string>();

        for (const row of result.rows) {
            allProducts.add(row.product_id as string);
            if (row.unit_type === 'BASE') {
                productsWithBase.add(row.product_id as string);
            }
        }

        const productsWithoutBase = Array.from(allProducts).filter(p => !productsWithBase.has(p));

        if (productsWithoutBase.length > 0) {
            console.log(`\n🔴 ${productsWithoutBase.length} producto(s) SIN unidad BASE:`);
            for (const productId of productsWithoutBase) {
                const productUnits = result.rows.filter(r => r.product_id === productId);
                const productName = productUnits[0]?.product_name || 'SIN NOMBRE';
                console.log(`   - ${productName} (ID: ${productId})`);
            }
        } else {
            console.log('\n✅ Todos los productos tienen unidad BASE');
        }

        console.log('\n✅ Análisis completado\n');

    } catch (error) {
        console.error('❌ Error al analizar unidades:', error);
        throw error;
    } finally {
        client.close();
    }
}

// Ejecutar análisis
analyzeUnitProducts().catch(console.error);
