// Script para ejecutar migración: agregar columna status a sales
// Ejecutar con: npx tsx migrations/add-status-column.ts

import 'dotenv/config';
import { createClient } from '@libsql/client';

const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!
});

async function runMigration() {
    try {
        console.log('🔄 Ejecutando migración: agregar columna status a sales...\n');

        // 1. Intentar agregar la columna status
        console.log('1️⃣ Agregando columna status...');
        try {
            await client.execute(`
                ALTER TABLE sales 
                ADD COLUMN status TEXT 
                CHECK(status IN ('ACTIVE', 'CANCELLED')) 
                DEFAULT 'ACTIVE'
            `);
            console.log('✅ Columna status agregada exitosamente');
        } catch (error: any) {
            if (error.message.includes('duplicate column name')) {
                console.log('ℹ️  La columna status ya existe');
            } else {
                throw error;
            }
        }

        // 2. Actualizar ventas existentes
        console.log('\n2️⃣ Actualizando ventas existentes...');
        const result = await client.execute(`
            UPDATE sales 
            SET status = 'ACTIVE' 
            WHERE status IS NULL
        `);
        console.log(`✅ ${result.rowsAffected} ventas actualizadas`);

        // 3. Verificar que la columna existe
        console.log('\n3️⃣ Verificando estructura de la tabla...');
        const tableInfo = await client.execute(`PRAGMA table_info(sales)`);
        const hasStatus = tableInfo.rows.some((row: any) => row.name === 'status');

        if (hasStatus) {
            console.log('✅ Columna status verificada correctamente');
        } else {
            throw new Error('❌ La columna status no se pudo agregar');
        }

        // 4. Mostrar algunas ventas de ejemplo
        console.log('\n4️⃣ Verificando datos...');
        const sales = await client.execute(`
            SELECT id, status, created_at 
            FROM sales 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        console.log('Últimas 5 ventas:');
        sales.rows.forEach((sale: any) => {
            console.log(`  - ${sale.id}: ${sale.status} (${sale.created_at})`);
        });

        console.log('\n✅ Migración completada exitosamente!');
        console.log('\n📋 Próximos pasos:');
        console.log('   1. Hacer commit y push de los cambios');
        console.log('   2. Desplegar a Vercel con: vercel --prod');
        console.log('   3. Probar cancelación de ventas');

    } catch (error: any) {
        console.error('\n❌ Error ejecutando migración:', error.message);
        throw error;
    } finally {
        client.close();
    }
}

runMigration();
