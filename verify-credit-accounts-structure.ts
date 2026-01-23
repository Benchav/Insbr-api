import { createClient } from '@libsql/client';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyDatabase() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    try {
        console.log('Verificando estructura de credit_accounts...\n');

        const tableInfo = await client.execute('PRAGMA table_info(credit_accounts)');

        console.log('Columnas en credit_accounts:');
        console.log('─'.repeat(50));
        tableInfo.rows.forEach((row: any) => {
            console.log(`${row.name.padEnd(20)} | ${row.type}`);
        });
        console.log('─'.repeat(50));

        const hasDeliveryDate = tableInfo.rows.some((row: any) => row.name === 'delivery_date');

        console.log('\nEstado de delivery_date:', hasDeliveryDate ? '❌ EXISTE' : '✅ NO EXISTE');

        if (!hasDeliveryDate) {
            console.log('\n✅ La columna delivery_date ha sido eliminada correctamente!');
        } else {
            console.log('\n⚠️  La columna delivery_date todavía existe en la base de datos');
        }

    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        client.close();
    }
}

verifyDatabase();
