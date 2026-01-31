import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Script para actualizar el teléfono de ambas sucursales
 */

async function updateBranchPhones() {
    console.log('📞 Actualizando teléfonos de sucursales...\n');

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    try {
        const newPhone = '+505 82971001';
        const branches = ['Diriamba', 'Jinotepe'];

        for (const branchName of branches) {
            console.log(`\n🏢 Procesando: ${branchName}`);
            console.log('─'.repeat(50));

            // Buscar la sucursal
            const result = await client.execute({
                sql: 'SELECT * FROM branches WHERE name = ?',
                args: [branchName]
            });

            if (result.rows.length === 0) {
                console.error(`❌ Sucursal ${branchName} no encontrada`);
                continue;
            }

            const branch = result.rows[0];
            console.log(`✅ Sucursal encontrada: ${branch.name}`);
            console.log(`   Teléfono actual: ${branch.phone}`);
            console.log(`   Teléfono nuevo: ${newPhone}`);

            // Actualizar teléfono
            await client.execute({
                sql: 'UPDATE branches SET phone = ? WHERE name = ?',
                args: [newPhone, branchName]
            });

            console.log(`✅ Teléfono actualizado exitosamente`);

            // Verificar actualización
            const verification = await client.execute({
                sql: 'SELECT * FROM branches WHERE name = ?',
                args: [branchName]
            });

            if (verification.rows.length > 0) {
                console.log(`\n📋 Verificación:`);
                console.log(`   Sucursal: ${verification.rows[0].name}`);
                console.log(`   Teléfono: ${verification.rows[0].phone}`);
                console.log(`   Dirección: ${verification.rows[0].address}`);
            }
        }

        console.log('\n' + '='.repeat(50));
        console.log('🎉 ¡Actualización completada para todas las sucursales!\n');

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    } finally {
        client.close();
    }
}

updateBranchPhones();
