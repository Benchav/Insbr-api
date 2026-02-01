import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config();

async function checkCurrentStock() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    try {
        console.log('🔍 VERIFICANDO STOCK ACTUAL\n');

        const products = [
            'Harina de Trigo Suave (Gemina)',
            'Margarina Industrial (Caja)',
            'Aceite Desmoldante Spray',
            'Chocolates y Cobertura de Chocolate Semiamargo',
            'Cocoa Alcalina 100%',
            'Crema Tipo Chantilly (Ambiente)',
            'Dulce de Leche Repostero',
            'Polvo de Hornear (Royal)'
        ];

        for (const name of products) {
            const productRes = await client.execute({
                sql: 'SELECT id, name, retail_price, wholesale_price FROM products WHERE name = ?',
                args: [name]
            });

            if (productRes.rows.length === 0) continue;
            const product = productRes.rows[0];

            const stockRes = await client.execute({
                sql: 'SELECT quantity, branch_id FROM stock WHERE product_id = ?',
                args: [product.id]
            });

            console.log(`📦 ${product.name}`);
            console.log(`   Precio Actual: C$ ${Number(product.retail_price) / 100}`);

            if (stockRes.rows.length > 0) {
                for (const stock of stockRes.rows) {
                    console.log(`   Stock en sucursal ${stock.branch_id}: ${stock.quantity}`);
                }
            } else {
                console.log('   ❌ Sin stock registrado');
            }
            console.log('');
        }

    } catch (error) {
        console.error(error);
    } finally {
        client.close();
    }
}

checkCurrentStock();
