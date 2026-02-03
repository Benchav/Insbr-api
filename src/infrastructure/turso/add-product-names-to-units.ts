import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function addProductNamesToUnits() {
    try {
        console.log('🔄 Agregando nombres de productos a las unidades...\n');
        console.log('='.repeat(80));

        // Obtener todas las unidades con sus productos
        const units = await client.execute(`
            SELECT 
                uc.id,
                uc.product_id,
                uc.unit_name,
                uc.unit_symbol,
                uc.conversion_factor,
                uc.unit_type,
                p.name as product_name
            FROM unit_conversions uc
            LEFT JOIN products p ON uc.product_id = p.id
            WHERE uc.is_active = 1
            ORDER BY uc.unit_name, p.name
        `);

        console.log(`📦 Total de unidades a actualizar: ${units.rows.length}\n`);

        let updatedCount = 0;
        const updates: Array<{ old: string, new: string, product: string }> = [];

        for (const row of units.rows) {
            const unitName = row.unit_name as string;
            const productName = row.product_name as string;
            const unitId = row.id as string;

            // Extraer nombre corto del producto (primeras 2-3 palabras)
            const shortProductName = getShortProductName(productName);

            // Crear nuevo nombre con el producto
            let newName: string;

            // Si ya tiene el nombre del producto, no actualizar
            if (unitName.includes('(') && unitName.includes(')')) {
                console.log(`⏭️  Saltando ${unitName} - ya tiene nombre de producto`);
                continue;
            }

            newName = `${unitName} (${shortProductName})`;

            console.log(`\n📝 Actualizando unidad ${unitId}:`);
            console.log(`   Producto: ${productName}`);
            console.log(`   Antes: "${unitName}"`);
            console.log(`   Después: "${newName}"`);

            // Actualizar en la base de datos
            await client.execute({
                sql: 'UPDATE unit_conversions SET unit_name = ? WHERE id = ?',
                args: [newName, unitId]
            });

            updates.push({
                old: unitName,
                new: newName,
                product: productName
            });

            updatedCount++;
            console.log(`   ✅ Actualizado`);
        }

        console.log('\n\n');
        console.log('='.repeat(80));
        console.log(`✅ Actualización completada: ${updatedCount} unidades actualizadas`);
        console.log('='.repeat(80));

        // Mostrar resumen
        console.log('\n📋 RESUMEN DE CAMBIOS:\n');

        const groupedByOldName = updates.reduce((acc, update) => {
            if (!acc[update.old]) {
                acc[update.old] = [];
            }
            acc[update.old].push(update);
            return acc;
        }, {} as Record<string, typeof updates>);

        for (const [oldName, items] of Object.entries(groupedByOldName)) {
            console.log(`\n"${oldName}" → ${items.length} producto(s):`);
            items.forEach(item => {
                console.log(`  ✅ "${item.new}"`);
            });
        }

        console.log('\n\n✅ Proceso completado exitosamente\n');

    } catch (error) {
        console.error('❌ Error al actualizar unidades:', error);
        throw error;
    } finally {
        client.close();
    }
}

function getShortProductName(fullName: string): string {
    // Remover texto entre paréntesis
    let name = fullName.replace(/\([^)]*\)/g, '').trim();

    // Tomar las primeras 2-3 palabras significativas
    const words = name.split(' ');

    // Lista de palabras a omitir
    const skipWords = ['de', 'la', 'el', 'los', 'las', 'y', 'tipo'];

    const significantWords = words.filter(word =>
        !skipWords.includes(word.toLowerCase())
    );

    // Tomar máximo 3 palabras
    const shortName = significantWords.slice(0, 3).join(' ');

    return shortName;
}

addProductNamesToUnits().catch(console.error);
