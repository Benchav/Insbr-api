import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function checkExactDuplicates() {
    try {
        console.log('🔍 VERIFICACIÓN DE DUPLICADOS EXACTOS\n');
        console.log('='.repeat(80));
        console.log('\nBuscando unidades duplicadas para el MISMO producto...\n');

        // Buscar duplicados exactos: mismo producto_id + mismo nombre + mismo factor
        const exactDuplicates = await client.execute(`
            SELECT 
                product_id,
                unit_name,
                conversion_factor,
                COUNT(*) as count,
                GROUP_CONCAT(id) as unit_ids
            FROM unit_conversions
            WHERE is_active = 1
            GROUP BY product_id, unit_name, conversion_factor
            HAVING COUNT(*) > 1
        `);

        if (exactDuplicates.rows.length === 0) {
            console.log('✅ NO HAY DUPLICADOS EXACTOS');
            console.log('\nTodas las unidades con el mismo nombre pertenecen a productos DIFERENTES.');
            console.log('Esto es CORRECTO y esperado.\n');
        } else {
            console.log('🔴 DUPLICADOS EXACTOS ENCONTRADOS:\n');

            for (const row of exactDuplicates.rows) {
                console.log(`Producto: ${row.product_id}`);
                console.log(`Unidad: ${row.unit_name} (factor: ${row.conversion_factor})`);
                console.log(`Cantidad de duplicados: ${row.count}`);
                console.log(`IDs: ${row.unit_ids}`);
                console.log('-'.repeat(80));
            }
        }

        // Mostrar resumen de unidades por nombre
        console.log('\n\n');
        console.log('='.repeat(80));
        console.log('📊 RESUMEN: UNIDADES POR NOMBRE\n');
        console.log('='.repeat(80));

        const unitsByName = await client.execute(`
            SELECT 
                uc.unit_name,
                uc.conversion_factor,
                COUNT(DISTINCT uc.product_id) as product_count,
                COUNT(*) as total_units,
                GROUP_CONCAT(DISTINCT p.name) as product_names
            FROM unit_conversions uc
            LEFT JOIN products p ON uc.product_id = p.id
            WHERE uc.is_active = 1
            GROUP BY uc.unit_name, uc.conversion_factor
            ORDER BY uc.unit_name, uc.conversion_factor
        `);

        for (const row of unitsByName.rows) {
            const isDuplicate = Number(row.total_units) > Number(row.product_count);
            const icon = isDuplicate ? '🔴' : '✅';

            console.log(`\n${icon} ${row.unit_name} (factor: ${row.conversion_factor})`);
            console.log(`   Productos diferentes: ${row.product_count}`);
            console.log(`   Total de registros: ${row.total_units}`);

            if (isDuplicate) {
                console.log(`   ⚠️  PROBLEMA: Hay ${Number(row.total_units) - Number(row.product_count)} duplicado(s) extra`);
            } else {
                console.log(`   ✅ OK: Cada registro pertenece a un producto diferente`);
            }

            // Mostrar nombres de productos (truncado si es muy largo)
            const names = (row.product_names as string || '').split(',');
            if (names.length <= 3) {
                names.forEach(name => console.log(`      - ${name}`));
            } else {
                console.log(`      - ${names[0]}`);
                console.log(`      - ${names[1]}`);
                console.log(`      - ... y ${names.length - 2} más`);
            }
        }

        console.log('\n\n');
        console.log('='.repeat(80));
        console.log('📝 EXPLICACIÓN\n');
        console.log('='.repeat(80));
        console.log('\n✅ CORRECTO: Diferentes productos pueden tener unidades con el mismo nombre.');
        console.log('   Ejemplo: "Libra" puede ser la unidad BASE de Harina, Chocolate, etc.\n');
        console.log('🔴 ERROR: El mismo producto NO debe tener dos unidades idénticas.');
        console.log('   Ejemplo: Harina con dos registros de "Libra" (factor 1)\n');

        console.log('\n✅ Análisis completado\n');

    } catch (error) {
        console.error('❌ Error:', error);
        throw error;
    } finally {
        client.close();
    }
}

checkExactDuplicates().catch(console.error);
