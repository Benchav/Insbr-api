import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
});

async function updateUnitNames() {
    try {
        console.log('🔄 Actualizando nombres de unidades en la base de datos...\n');
        console.log('='.repeat(80));

        // Obtener todas las unidades de tipo PURCHASE con nombres genéricos
        const result = await client.execute(`
            SELECT 
                id,
                product_id,
                unit_name,
                unit_symbol,
                conversion_factor
            FROM unit_conversions
            WHERE unit_type = 'PURCHASE' 
            AND unit_name IN ('Caja', 'Paquete', 'Bulto', 'Saco')
            AND is_active = 1
        `);

        console.log(`📦 Unidades a actualizar: ${result.rows.length}\n`);

        if (result.rows.length === 0) {
            console.log('✅ No hay unidades genéricas para actualizar');
            return;
        }

        let updatedCount = 0;

        for (const row of result.rows) {
            const oldName = row.unit_name as string;
            const factor = row.conversion_factor as number;
            const id = row.id as string;

            // Crear nuevo nombre descriptivo
            const newName = `${oldName} x${factor}`;

            console.log(`\n📝 Actualizando unidad ${id}:`);
            console.log(`   Antes: "${oldName}" (factor: ${factor})`);
            console.log(`   Después: "${newName}"`);

            // Actualizar en la base de datos
            await client.execute({
                sql: 'UPDATE unit_conversions SET unit_name = ? WHERE id = ?',
                args: [newName, id]
            });

            updatedCount++;
            console.log(`   ✅ Actualizado`);
        }

        console.log('\n\n');
        console.log('='.repeat(80));
        console.log(`✅ Actualización completada: ${updatedCount} unidades actualizadas`);
        console.log('='.repeat(80));

        // Mostrar resultado final
        console.log('\n📋 Verificando cambios...\n');

        const verification = await client.execute(`
            SELECT 
                unit_name,
                unit_symbol,
                conversion_factor,
                COUNT(*) as count
            FROM unit_conversions
            WHERE unit_type = 'PURCHASE' AND is_active = 1
            GROUP BY unit_name, conversion_factor
            ORDER BY unit_name
        `);

        console.log('Unidades de compra actuales:');
        verification.rows.forEach(row => {
            console.log(`  • ${row.unit_name} (${row.unit_symbol}) - Factor: ${row.conversion_factor} - ${row.count} producto(s)`);
        });

        console.log('\n✅ Proceso completado exitosamente\n');

    } catch (error) {
        console.error('❌ Error al actualizar unidades:', error);
        throw error;
    } finally {
        client.close();
    }
}

// Ejecutar actualización
updateUnitNames().catch(console.error);
