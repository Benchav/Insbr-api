import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function verifyUpdates() {
    const client = createClient({
        url: process.env.TURSO_DATABASE_URL!,
        authToken: process.env.TURSO_AUTH_TOKEN!
    });

    const results: string[] = [];

    try {
        results.push('=== VERIFICACIÓN POST-ACTUALIZACIÓN ===\n\n');

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

            // Buscar la unidad BASE para saber qué esperamos
            const unitRes = await client.execute({
                sql: 'SELECT unit_name, unit_symbol FROM unit_conversions WHERE product_id = ? AND unit_type = "BASE"',
                args: [product.id]
            });
            const unit = unitRes.rows[0];

            results.push(`📦 ${product.name}\n`);
            results.push(`   Precio Actual: C$ ${(Number(product.retail_price) / 100).toFixed(2)}\n`);
            results.push(`   Unidad Base: ${unit ? unit.unit_name : 'N/A'}\n`);

            if (stockRes.rows.length > 0) {
                for (const stock of stockRes.rows) {
                    results.push(`   Stock: ${stock.quantity} ${unit ? unit.unit_symbol : ''}\n`);
                }
            } else {
                results.push('   ❌ Sin stock registrado\n');
            }
            results.push('\n');
        }

        const output = results.join('');
        console.log(output);
        fs.writeFileSync('update-verification.txt', output);

    } catch (error) {
        console.error(error);
    } finally {
        client.close();
    }
}

verifyUpdates();
