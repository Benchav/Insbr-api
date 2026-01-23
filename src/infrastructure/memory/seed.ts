import { storage } from './storage.js';
import bcrypt from 'bcrypt';

export async function seedData(): Promise<void> {
    console.log('🌱 Cargando datos iniciales...');
    storage.clear();

    // 1. Sucursales con IDs Estáticos
    const diriamba = {
        id: 'BRANCH-DIR-001',
        name: 'Diriamba',
        code: 'DIR',
        address: 'Diriamba, Carazo, Nicaragua',
        phone: '+505 2534-0000',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const jinotepe = {
        id: 'BRANCH-JIN-001',
        name: 'Jinotepe',
        code: 'JIN',
        address: 'Jinotepe, Carazo, Nicaragua',
        phone: '+505 2532-0000',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    storage.branches.set(diriamba.id, diriamba);
    storage.branches.set(jinotepe.id, jinotepe);

    // 2. Productos
    const products = [
        {
            id: 'PROD-HAR-001',
            name: 'Harina de Trigo Premium',
            description: 'Saco de 50 kg',
            sku: 'HAR-TRIG-001',
            category: 'Harinas',
            costPrice: 180000,
            retailPrice: 220000,
            wholesalePrice: 200000,
            unit: 'saco',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'PROD-AZU-001',
            name: 'Azúcar Refinada',
            description: 'Saco de 50 kg',
            sku: 'AZU-REF-001',
            category: 'Endulzantes',
            costPrice: 150000,
            retailPrice: 185000,
            wholesalePrice: 170000,
            unit: 'saco',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    products.forEach(p => storage.products.set(p.id, p));

    // 3. Stock Inicial
    products.forEach(product => {
        const stockDirId = `STOCK-${product.sku}-DIR`;
        storage.stock.set(stockDirId, {
            id: stockDirId,
            productId: product.id,
            branchId: diriamba.id,
            quantity: 50,
            minStock: 10,
            maxStock: 200,
            updatedAt: new Date()
        });

        const stockJinId = `STOCK-${product.sku}-JIN`;
        storage.stock.set(stockJinId, {
            id: stockJinId,
            productId: product.id,
            branchId: jinotepe.id,
            quantity: 30,
            minStock: 10,
            maxStock: 200,
            updatedAt: new Date()
        });
    });

    // 4. Proveedor
    const supplier = {
        id: 'SUPP-NACIONAL-001',
        name: 'Distribuidora Nacional S.A.',
        contactName: 'Carlos Méndez',
        phone: '+505 2250-1234',
        email: 'ventas@disnacional.com.ni',
        address: 'Managua',
        taxId: 'J0310000012345',
        creditDays: 30,
        creditLimit: 50000000,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    storage.suppliers.set(supplier.id, supplier);

    // 5. Cliente Mayorista
    const customer = {
        id: 'CUST-BUENPAN-001',
        name: 'Panadería El Buen Pan',
        contactName: 'María González',
        phone: '+505 8765-4321',
        email: 'info@elbuenpan.com',
        address: 'Jinotepe',
        taxId: 'J0310000054321',
        creditLimit: 50000000,
        currentDebt: 0,
        creditDays: 30, // 30 días de crédito para mayoristas
        type: 'WHOLESALE' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    storage.customers.set(customer.id, customer);

    // 6. Usuarios del Sistema (con passwords hasheados)
    const passwordHash = await bcrypt.hash('123', 10); // Hash del password "123"

    const users = [
        // ADMIN Global - Puede ver todas las sucursales
        {
            id: 'USER-ADMIN-GLOBAL',
            username: 'admin',
            password: passwordHash,
            name: 'Admin Global',
            role: 'ADMIN' as const,
            branchId: diriamba.id, // Sucursal principal pero puede ver todas
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        // Diriamba - Gerente y Cajero
        {
            id: 'USER-DIR-GERENTE',
            username: 'gerente_diriamba',
            password: passwordHash,
            name: 'Gerente Diriamba',
            role: 'GERENTE' as const,
            branchId: diriamba.id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'USER-DIR-CAJERO',
            username: 'cajero_diriamba',
            password: passwordHash,
            name: 'Cajero Diriamba',
            role: 'CAJERO' as const,
            branchId: diriamba.id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        // Jinotepe - Gerente y Cajero
        {
            id: 'USER-JIN-GERENTE',
            username: 'gerente_jinotepe',
            password: passwordHash,
            name: 'Gerente Jinotepe',
            role: 'GERENTE' as const,
            branchId: jinotepe.id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: 'USER-JIN-CAJERO',
            username: 'cajero_jinotepe',
            password: passwordHash,
            name: 'Cajero Jinotepe',
            role: 'CAJERO' as const,
            branchId: jinotepe.id,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    users.forEach(u => storage.users.set(u.id, u));

    console.log('✅ Datos de prueba (Seed) cargados exitosamente.');
}
