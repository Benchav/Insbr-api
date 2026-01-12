import { storage } from './storage.js';
import { randomUUID } from 'crypto';

/**
 * Carga datos iniciales en el sistema
 */
export async function seedData(): Promise<void> {
    console.log('🌱 Cargando datos iniciales...');

    // 1. Crear sucursales
    const diriamba = {
        id: randomUUID(),
        name: 'Diriamba',
        code: 'DIR',
        address: 'Diriamba, Carazo, Nicaragua',
        phone: '+505 2534-0000',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    const jinotepe = {
        id: randomUUID(),
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
    console.log(`✅ Sucursales creadas: ${diriamba.name}, ${jinotepe.name}`);

    // 2. Crear productos de insumos
    const products = [
        {
            id: randomUUID(),
            name: 'Harina de Trigo Premium',
            description: 'Harina de trigo para panadería, saco de 50 kg',
            sku: 'HAR-TRIG-001',
            category: 'Harinas',
            costPrice: 180000, // C$ 1,800.00
            retailPrice: 220000, // C$ 2,200.00
            wholesalePrice: 200000, // C$ 2,000.00
            unit: 'saco',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: randomUUID(),
            name: 'Azúcar Refinada',
            description: 'Azúcar refinada, saco de 50 kg',
            sku: 'AZU-REF-001',
            category: 'Endulzantes',
            costPrice: 150000, // C$ 1,500.00
            retailPrice: 185000, // C$ 1,850.00
            wholesalePrice: 170000, // C$ 1,700.00
            unit: 'saco',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: randomUUID(),
            name: 'Aceite Vegetal',
            description: 'Aceite vegetal para cocina, galón',
            sku: 'ACE-VEG-001',
            category: 'Aceites',
            costPrice: 45000, // C$ 450.00
            retailPrice: 58000, // C$ 580.00
            wholesalePrice: 52000, // C$ 520.00
            unit: 'galón',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: randomUUID(),
            name: 'Sal Industrial',
            description: 'Sal para uso industrial, saco de 25 kg',
            sku: 'SAL-IND-001',
            category: 'Condimentos',
            costPrice: 12000, // C$ 120.00
            retailPrice: 16000, // C$ 160.00
            wholesalePrice: 14500, // C$ 145.00
            unit: 'saco',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        {
            id: randomUUID(),
            name: 'Levadura Instantánea',
            description: 'Levadura instantánea para panadería, paquete de 500g',
            sku: 'LEV-INS-001',
            category: 'Levaduras',
            costPrice: 8500, // C$ 85.00
            retailPrice: 12000, // C$ 120.00
            wholesalePrice: 10500, // C$ 105.00
            unit: 'paquete',
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    ];

    products.forEach(p => storage.products.set(p.id, p));
    console.log(`✅ Productos creados: ${products.length} insumos`);

    // 3. Crear stock inicial en ambas sucursales
    products.forEach(product => {
        // Stock en Diriamba
        const stockDir = {
            id: randomUUID(),
            productId: product.id,
            branchId: diriamba.id,
            quantity: 50,
            minStock: 10,
            maxStock: 200,
            updatedAt: new Date()
        };
        storage.stock.set(stockDir.id, stockDir);

        // Stock en Jinotepe
        const stockJin = {
            id: randomUUID(),
            productId: product.id,
            branchId: jinotepe.id,
            quantity: 30,
            minStock: 10,
            maxStock: 200,
            updatedAt: new Date()
        };
        storage.stock.set(stockJin.id, stockJin);
    });
    console.log(`✅ Stock inicial creado en ambas sucursales`);

    // 4. Crear proveedor con deuda pendiente
    const supplier = {
        id: randomUUID(),
        name: 'Distribuidora Nacional S.A.',
        contactName: 'Carlos Méndez',
        phone: '+505 2250-1234',
        email: 'ventas@disnacional.com.ni',
        address: 'Managua, Nicaragua',
        taxId: 'J0310000012345',
        creditDays: 30,
        creditLimit: 50000000, // C$ 500,000.00
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    storage.suppliers.set(supplier.id, supplier);
    console.log(`✅ Proveedor creado: ${supplier.name}`);

    // Crear cuenta por pagar (CPP) con el proveedor
    const creditAccount = {
        id: randomUUID(),
        type: 'CPP' as const,
        branchId: diriamba.id,
        supplierId: supplier.id,
        totalAmount: 500000, // C$ 5,000.00
        paidAmount: 200000, // C$ 2,000.00
        balanceAmount: 300000, // C$ 3,000.00
        status: 'PAGADO_PARCIAL' as const,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días
        createdAt: new Date(),
        updatedAt: new Date()
    };
    storage.creditAccounts.set(creditAccount.id, creditAccount);
    console.log(`✅ Cuenta por pagar creada con saldo pendiente de C$ 3,000.00`);

    // 5. Crear cliente con línea de crédito
    const customer = {
        id: randomUUID(),
        name: 'Panadería El Buen Pan',
        contactName: 'María González',
        phone: '+505 8765-4321',
        email: 'elbenpan@gmail.com',
        address: 'Jinotepe, Carazo',
        taxId: 'J0310000054321',
        creditLimit: 50000000, // C$ 500,000.00
        currentDebt: 0,
        type: 'WHOLESALE' as const,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
    };
    storage.customers.set(customer.id, customer);
    console.log(`✅ Cliente creado: ${customer.name} con línea de crédito de C$ 500,000.00`);

    console.log('✨ Datos iniciales cargados exitosamente\n');
    console.log('📊 Resumen:');
    console.log(`   - Sucursales: ${storage.branches.size}`);
    console.log(`   - Productos: ${storage.products.size}`);
    console.log(`   - Proveedores: ${storage.suppliers.size}`);
    console.log(`   - Clientes: ${storage.customers.size}`);
    console.log(`   - Cuentas de crédito: ${storage.creditAccounts.size}`);
    console.log('');
}
