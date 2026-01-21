import 'dotenv/config';
import { tursoClient, testConnection } from './client.js';
import bcrypt from 'bcrypt';

/**
 * Script de seed para poblar la base de datos Turso con datos iniciales
 */
async function seedDatabase() {
    console.log('🌱 Iniciando seed de base de datos Turso...\n');

    // Verificar conexión
    const connected = await testConnection();
    if (!connected) {
        console.error('❌ No se pudo conectar a Turso. Abortando seed.');
        process.exit(1);
    }

    try {
        // 1. Crear Sucursales
        console.log('📍 Creando sucursales...');
        const branches = [
            {
                id: 'BRANCH-DIR-001',
                name: 'Diriamba',
                code: 'DIR',
                address: 'Centro de Diriamba',
                phone: '2534-0000'
            },
            {
                id: 'BRANCH-JIN-001',
                name: 'Jinotepe',
                code: 'JIN',
                address: 'Centro de Jinotepe',
                phone: '2532-0000'
            }
        ];

        for (const branch of branches) {
            await tursoClient.execute({
                sql: `INSERT OR IGNORE INTO branches (id, name, code, address, phone, is_active, created_at, updated_at)
                      VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
                args: [branch.id, branch.name, branch.code, branch.address, branch.phone]
            });
            console.log(`  ✅ ${branch.name} (${branch.code})`);
        }

        // 2. Crear Usuarios
        console.log('\n👥 Creando usuarios...');
        const users = [
            {
                id: 'USER-ADMIN-DIR-001',
                username: 'admin_diriamba',
                password: await bcrypt.hash('123', 10),
                name: 'Administrador Diriamba',
                role: 'ADMIN',
                branchId: 'BRANCH-DIR-001'
            },
            {
                id: 'USER-ADMIN-JIN-001',
                username: 'admin_jinotepe',
                password: await bcrypt.hash('123', 10),
                name: 'Administrador Jinotepe',
                role: 'ADMIN',
                branchId: 'BRANCH-JIN-001'
            },
            {
                id: 'USER-SELLER-DIR-001',
                username: 'cajero_diriamba',
                password: await bcrypt.hash('123', 10),
                name: 'Cajero Diriamba',
                role: 'SELLER',
                branchId: 'BRANCH-DIR-001'
            },
            {
                id: 'USER-SELLER-JIN-001',
                username: 'cajero_jinotepe',
                password: await bcrypt.hash('123', 10),
                name: 'Cajero Jinotepe',
                role: 'SELLER',
                branchId: 'BRANCH-JIN-001'
            }
        ];

        for (const user of users) {
            await tursoClient.execute({
                sql: `INSERT OR IGNORE INTO users (id, username, password, name, role, branch_id, is_active, created_at, updated_at)
                      VALUES (?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
                args: [user.id, user.username, user.password, user.name, user.role, user.branchId]
            });
            console.log(`  ✅ ${user.name} (@${user.username}) - ${user.role}`);
        }

        // 3. Crear Productos de Ejemplo
        console.log('\n📦 Creando productos de ejemplo...');
        const products = [
            {
                id: 'PROD-HAR-TRIG-001',
                name: 'Harina de Trigo Premium',
                description: 'Harina de trigo de alta calidad para panadería',
                sku: 'HAR-TRIG-001',
                category: 'Harinas',
                costPrice: 15000,      // C$150.00
                retailPrice: 18000,    // C$180.00
                wholesalePrice: 16500, // C$165.00
                unit: 'kg'
            },
            {
                id: 'PROD-AZU-BLA-001',
                name: 'Azúcar Blanca',
                description: 'Azúcar refinada blanca',
                sku: 'AZU-BLA-001',
                category: 'Azúcares',
                costPrice: 8000,       // C$80.00
                retailPrice: 10000,    // C$100.00
                wholesalePrice: 9000,  // C$90.00
                unit: 'kg'
            }
        ];

        for (const product of products) {
            await tursoClient.execute({
                sql: `INSERT OR IGNORE INTO products (id, name, description, sku, category, cost_price, retail_price, wholesale_price, unit, is_active, created_at, updated_at)
                      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))`,
                args: [
                    product.id, product.name, product.description, product.sku, product.category,
                    product.costPrice, product.retailPrice, product.wholesalePrice, product.unit
                ]
            });
            console.log(`  ✅ ${product.name} (${product.sku})`);
        }

        // 4. Crear Stock Inicial
        console.log('\n📊 Creando stock inicial...');
        const stocks = [
            {
                id: 'STOCK-HAR-TRIG-001-DIR',
                productId: 'PROD-HAR-TRIG-001',
                branchId: 'BRANCH-DIR-001',
                quantity: 50,
                minStock: 10,
                maxStock: 200
            },
            {
                id: 'STOCK-HAR-TRIG-001-JIN',
                productId: 'PROD-HAR-TRIG-001',
                branchId: 'BRANCH-JIN-001',
                quantity: 50,
                minStock: 10,
                maxStock: 200
            },
            {
                id: 'STOCK-AZU-BLA-001-DIR',
                productId: 'PROD-AZU-BLA-001',
                branchId: 'BRANCH-DIR-001',
                quantity: 100,
                minStock: 20,
                maxStock: 300
            },
            {
                id: 'STOCK-AZU-BLA-001-JIN',
                productId: 'PROD-AZU-BLA-001',
                branchId: 'BRANCH-JIN-001',
                quantity: 100,
                minStock: 20,
                maxStock: 300
            }
        ];

        for (const stock of stocks) {
            await tursoClient.execute({
                sql: `INSERT OR IGNORE INTO stock (id, product_id, branch_id, quantity, min_stock, max_stock, updated_at)
                      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
                args: [stock.id, stock.productId, stock.branchId, stock.quantity, stock.minStock, stock.maxStock]
            });
            console.log(`  ✅ Stock creado para producto ${stock.productId} en sucursal ${stock.branchId}`);
        }

        console.log('\n✅ Seed completado exitosamente!');
        console.log('\n📋 Resumen:');
        console.log(`   - ${branches.length} sucursales`);
        console.log(`   - ${users.length} usuarios`);
        console.log(`   - ${products.length} productos`);
        console.log(`   - ${stocks.length} registros de stock`);
        console.log('\n🔐 Credenciales de acceso:');
        console.log('   Admin Diriamba: admin_diriamba / 123');
        console.log('   Admin Jinotepe: admin_jinotepe / 123');
        console.log('   Cajero Diriamba: cajero_diriamba / 123');
        console.log('   Cajero Jinotepe: cajero_jinotepe / 123');

    } catch (error) {
        console.error('❌ Error durante el seed:', error);
        process.exit(1);
    }
}

// Ejecutar seed
seedDatabase()
    .then(() => {
        console.log('\n🎉 Proceso completado!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Error fatal:', error);
        process.exit(1);
    });
