import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
    console.log('🔄 Conectando a Turso...');

    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    try {
        console.log('📋 Verificando estructura actual de credit_accounts...');

        // Ver estructura actual
        const tableInfo = await client.execute('PRAGMA table_info(credit_accounts)');
        console.log('\n📊 Columnas actuales:');
        tableInfo.rows.forEach((row: any) => {
            console.log(`  - ${row.name} (${row.type})`);
        });

        // Verificar si existe la columna delivery_date
        const hasDeliveryDate = tableInfo.rows.some((row: any) => row.name === 'delivery_date');

        if (!hasDeliveryDate) {
            console.log('\n✅ La columna delivery_date ya no existe. Migración no necesaria.');
            return;
        }

        console.log('\n⚠️  Encontrada columna delivery_date. Procediendo a eliminarla...');

        // Ejecutar migración
        await client.execute('ALTER TABLE credit_accounts DROP COLUMN delivery_date');

        console.log('✅ Columna delivery_date eliminada exitosamente!');

        // Verificar resultado
        console.log('\n📋 Verificando estructura actualizada...');
        const updatedTableInfo = await client.execute('PRAGMA table_info(credit_accounts)');
        console.log('\n📊 Columnas después de la migración:');
        updatedTableInfo.rows.forEach((row: any) => {
            console.log(`  - ${row.name} (${row.type})`);
        });

        const stillHasDeliveryDate = updatedTableInfo.rows.some((row: any) => row.name === 'delivery_date');

        if (stillHasDeliveryDate) {
            throw new Error('❌ Error: La columna delivery_date todavía existe después de la migración');
        }

        console.log('\n✅ Migración completada exitosamente!');
        console.log('✅ La columna delivery_date ha sido eliminada de credit_accounts');

    } catch (error: any) {
        console.error('\n❌ Error ejecutando migración:', error.message);
        throw error;
    } finally {
        client.close();
    }
}

// Ejecutar migración
runMigration()
    .then(() => {
        console.log('\n🎉 Proceso completado!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n💥 Proceso fallido:', error);
        process.exit(1);
    });
