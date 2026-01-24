import 'dotenv/config';
import { PurchaseService } from './src/application/services/purchase.service.js';
import { PurchaseRepositoryTurso } from './src/infrastructure/turso/repositories/purchase.repository.turso.js';
import { StockRepositoryTurso } from './src/infrastructure/turso/repositories/stock.repository.turso.js';
import { SupplierRepositoryTurso } from './src/infrastructure/turso/repositories/supplier.repository.turso.js';
import { CreditAccountRepositoryTurso } from './src/infrastructure/turso/repositories/credit-account.repository.turso.js';
import { CashMovementRepositoryTurso } from './src/infrastructure/turso/repositories/cash-movement.repository.turso.js';
import { BranchRepositoryTurso } from './src/infrastructure/turso/repositories/branch.repository.turso.js';
import { ProductRepositoryTurso } from './src/infrastructure/turso/repositories/product.repository.turso.js';
import { UserRepositoryTurso } from './src/infrastructure/turso/repositories/user.repository.turso.js';
import { CreatePurchaseDto } from './src/core/entities/purchase.entity.js';
import { CreateSupplierDto } from './src/core/entities/supplier.entity.js';
import { CreateProductDto } from './src/core/entities/product.entity.js';
import { CreateBranchDto } from './src/core/entities/branch.entity.js';
import { User } from './src/core/entities/user.entity.js';
import { tursoClient } from './src/infrastructure/turso/client.js'; // Import tursoClient

async function verifyPurchaseCancellation() {
    console.log('🔄 Verificando Cancelación de Compras...');

    const purchaseRepo = new PurchaseRepositoryTurso();
    const stockRepo = new StockRepositoryTurso();
    const supplierRepo = new SupplierRepositoryTurso();
    const creditRepo = new CreditAccountRepositoryTurso();
    const cashRepo = new CashMovementRepositoryTurso();
    const branchRepo = new BranchRepositoryTurso();
    const productRepo = new ProductRepositoryTurso();
    const userRepo = new UserRepositoryTurso();

    const purchaseService = new PurchaseService(
        purchaseRepo,
        stockRepo,
        supplierRepo,
        creditRepo,
        cashRepo
    );

    // Variables for cleanup
    let purchaseId: string | null = null;
    let supplierId: string | null = null;
    let productId: string | null = null;
    let userId: string | null = null;

    try {
        // --- PREPARACIÓN ---
        let branchId = '';
        const branches = await branchRepo.findAll();
        if (branches.length > 0) branchId = branches[0].id;
        else {
            const b = await branchRepo.create({ name: 'Sucursal Test', code: `TEST-${Date.now()}`, address: 'X', phone: 'X', isActive: true });
            branchId = b.id;
        }

        const users = await userRepo.findAll();
        if (users.length > 0) userId = users[0].id; // Ensure Admin?
        else {
            const u = await userRepo.create({
                id: `USER-${Date.now()}`, username: `test${Date.now()}`, password: 'x', name: 'Test', role: 'ADMIN', branchId, isActive: true, createdAt: new Date(), updatedAt: new Date()
            } as User);
            userId = u.id;
        }

        // Product
        const productData: CreateProductDto = { name: `Prod Reversal ${Date.now()}`, description: 'Desc', sku: `SKU-REV-${Date.now()}`, category: 'TEST', costPrice: 100, retailPrice: 200, wholesalePrice: 150, unit: 'UNIDAD', isActive: true }; // Added isActive
        const product = await productRepo.create(productData);
        productId = product.id;

        // Supplier
        const supplierData: CreateSupplierDto = { name: `Prov Reversal ${Date.now()}`, contactName: 'Juan', phone: '8888', address: 'X', creditDays: 30, creditLimit: 50000, isActive: true };
        const supplier = await supplierRepo.create(supplierData);
        supplierId = supplier.id;


        // --- CASO 1: Cancelar Crédito (CPP) ---
        console.log('\n🧪 Prueba 1: Cancelar Compra Crédito');

        // 1. Crear
        const purchase = await purchaseService.createPurchase({
            branchId,
            supplierId: supplier.id,
            items: [{ productId: product.id, productName: product.name, quantity: 10, unitCost: 100, subtotal: 1000 }],
            subtotal: 1000, tax: 0, discount: 0, total: 1000, type: 'CREDIT', createdBy: userId!, invoiceNumber: 'INV-CANCEL-TEST', status: 'COMPLETED'
        });
        purchaseId = purchase.id;

        // 2. Verificar Estado Inicial
        let stock = await stockRepo.findByProductAndBranch(product.id, branchId);
        console.log(`   Stock Inicial: ${stock?.quantity} (Esperado: 10)`);

        // 3. Cancelar
        console.log('   Cancelando...');
        await purchaseService.cancelPurchase(purchase.id, userId!);

        // 4. Verificar Reversión
        stock = await stockRepo.findByProductAndBranch(product.id, branchId);
        console.log(`   Stock Final: ${stock?.quantity} (Esperado: 0)`);

        const creditAccounts = await creditRepo.findByBranch(branchId);
        const cpp = creditAccounts.find(c => c.purchaseId === purchase.id);
        console.log(`   CPP Eliminada: ${!cpp}`);

        const cancelledPurchase = await purchaseRepo.findById(purchase.id);
        console.log(`   Estado Compra: ${cancelledPurchase?.status} (Esperado: CANCELLED)`);

        if (stock?.quantity === 0 && !cpp && cancelledPurchase?.status === 'CANCELLED') {
            console.log('✅ Prueba 1 Pasó: Stock y Deuda revertidos.');
            console.log('✅ Finalizado con éxito.');
        } else {
            throw new Error('❌ Fallo en reversión de crédito');
        }

    } catch (error: any) {
        const fs = await import('fs');
        fs.writeFileSync('cancellation-error.txt', JSON.stringify(error, null, 2) + '\n' + error.stack);
        console.error('❌ Error general: Ver archivo cancellation-error.txt');
    } finally {
        console.log('\n🧹 Iniciando Limpieza...');
        try {
            if (purchaseId) {
                // Delete items first manually to ensure product deletion works if cascade fails
                await tursoClient.execute({ sql: 'DELETE FROM purchase_items WHERE purchase_id = ?', args: [purchaseId] });
                await purchaseRepo.delete(purchaseId);
            }
            if (supplierId) await supplierRepo.delete(supplierId);
            if (productId) await productRepo.delete(productId);
        } catch (e) {
            console.warn('⚠️ Error en limpieza (ignorable):', e);
        }
        console.log('🧹 Limpieza completada.');
    }
}

verifyPurchaseCancellation();
