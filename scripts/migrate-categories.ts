import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configurar entorno
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
    console.error('Error: Variables de entorno TURSO_DATABASE_URL y TURSO_AUTH_TOKEN requeridas');
    process.exit(1);
}

const client = createClient({ url, authToken });

async function migrateCategories() {
    console.log('🚀 Iniciando migración de categorías...');

    try {
        // 1. Crear tabla categories
        console.log('1. Creando tabla categories...');
        await client.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT (datetime('now')),
                updated_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);
        // Index unique name
        await client.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name ON categories(name)`);

        // 2. Agregar columna category_id a products si no existe
        console.log('2. Verificando columna category_id en products...');
        try {
            // Intentamos agregarla. Si falla es que ya existe (SQLite no tiene IF NOT EXISTS para columnas fácil)
            await client.execute(`ALTER TABLE products ADD COLUMN category_id TEXT`);
            console.log('   -> Columna agregada.');
        } catch (e: any) {
            if (e.message.includes('duplicate column name')) {
                console.log('   -> La columna ya existe.');
            } else {
                throw e;
            }
        }

        // 3. Obtener categorías existentes (texto) de productos
        console.log('3. Analizando categorías existentes en productos...');
        const result = await client.execute(`SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ''`);

        const existingCategories = result.rows.map(row => row.category as string);
        console.log(`   -> Encontradas ${existingCategories.length} categorías distintas:`, existingCategories);

        // 4. Insertar en tabla categories y actualizar productos
        console.log('4. Migrando datos...');

        for (const catName of existingCategories) {
            // Check if exists in categories table
            const existingCat = await client.execute({
                sql: 'SELECT id FROM categories WHERE name = ?',
                args: [catName]
            });

            let catId: string;

            if (existingCat.rows.length > 0) {
                catId = existingCat.rows[0].id as string;
                console.log(`   -> Categoría '${catName}' ya existe en tabla (ID: ${catId}). Usando existente.`);
            } else {
                catId = `CAT-MIG-${Date.now()}-${Math.random().toString(36).substring(7)}`;
                await client.execute({
                    sql: `INSERT INTO categories (id, name, is_active) VALUES (?, ?, 1)`,
                    args: [catId, catName]
                });
                console.log(`   -> Creando categoría '${catName}' (ID: ${catId}).`);
            }

            // Actualizar productos
            const updateRes = await client.execute({
                sql: `UPDATE products SET category_id = ? WHERE category = ?`,
                args: [catId, catName]
            });
            console.log(`      -> ${updateRes.rowsAffected} productos actualizados.`);
        }

        // 5. Crear índice para FK
        console.log('5. Creando índices...');
        await client.execute(`CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id)`);

        console.log('✅ Migración completada exitosamente.');

    } catch (error) {
        console.error('❌ Error durante la migración:', error);
        process.exit(1);
    }
}

migrateCategories();
