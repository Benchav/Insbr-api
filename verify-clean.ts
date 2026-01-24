import 'dotenv/config';
import { PurchaseService } from './src/application/services/purchase.service.js';
import { PurchaseRepositoryTurso } from './src/infrastructure/turso/repositories/purchase.repository.turso.js';
import { StockRepositoryTurso } from './src/infrastructure/turso/repositories/stock.repository.turso.js';
import { SupplierRepositoryTurso } from './src/infrastructure/turso/repositories/supplier.repository.turso.js';
import { CreditAccountRepositoryTurso } from './src/infrastructure/turso/repositories/credit-account.repository.turso.js';
import { CashMovementRepositoryTurso } from './src/infrastructure/turso/repositories/cash-movement.repository.turso.js';
import { ProductRepositoryTurso } from './src/infrastructure/turso/repositories/product.repository.turso.js';
import { CreateProductDto } from './src/core/entities/product.entity.js';
import { CreateSupplierDto } from './src/core/entities/supplier.entity.js';
import { UserRepositoryTurso } from './src/infrastructure/turso/repositories/user.repository.turso.js';
import { BranchRepositoryTurso } from './src/infrastructure/turso/repositories/branch.repository.turso.js';
import { User } from './src/core/entities/user.entity.js';

async function verifyClean() {
    console.log('🚀 Iniciando Verificación Limpia...');
    const purchaseRepo = new PurchaseRepositoryTurso();
    const stockRepo = new StockRepositoryTurso();
    const supplierRepo = new SupplierRepositoryTurso();
    const creditRepo = new CreditAccountRepositoryTurso();
    const cashRepo = new CashMovementRepositoryTurso();
    const productRepo = new ProductRepositoryTurso();
    const userRepo = new UserRepositoryTurso();
    const branchRepo = new BranchRepositoryTurso();

    const purchaseService = new PurchaseService(purchaseRepo, stockRepo, supplierRepo, creditRepo, cashRepo);

    try {
        // Setup
        const branches = await branchRepo.findAll();
        const branchId = branches.length > 0 ? branches[0].id : (await branchRepo.create({ name: 'TestBranch', code: `TB-${Date.now()}`, address: 'X', phone: 'X', isActive: true })).id;

        const users = await userRepo.findAll();
        const userId = users.length > 0 ? users[0].id : (await userRepo.create({ id: `U-${Date.now()}`, username: `u${Date.now()}`, password: 'x', name: 'T', role: 'ADMIN', branchId, isActive: true, createdAt: new Date(), updatedAt: new Date() } as User)).id;

        const product = await productRepo.create({ name: `P${Date.now()}`, description: 'D', sku: `SKU${Date.now()}`, category: 'C', costPrice: 100, retailPrice: 200, wholesalePrice: 150, unit: 'U', isActive: true });
        const supplier = await supplierRepo.create({ name: `S${Date.now()}`, contactName: 'C', phone: 'P', address: 'A', creditDays: 30, creditLimit: 1000, isActive: true });

        // Create Purchase
        console.log('1. Creando Compra...');
        const purchase = await purchaseService.createPurchase({
            branchId, supplierId: supplier.id,
            items: [{ productId: product.id, productName: product.name, quantity: 5, unitCost: 100, subtotal: 500 }],
            subtotal: 500, tax: 0, discount: 0, total: 500, type: 'CREDIT', createdBy: userId, invoiceNumber: 'INV1', status: 'COMPLETED'
        });

        // Cancel Purchase
        console.log('2. Cancelando Compra...');
        await purchaseService.cancelPurchase(purchase.id, userId);

        // Verify
        const pCheck = await purchaseRepo.findById(purchase.id);
        const cppCheck = (await creditRepo.findByBranch(branchId)).find(c => c.purchaseId === purchase.id);
        const stockCheck = await stockRepo.findByProductAndBranch(product.id, branchId);

        if (pCheck?.status === 'CANCELLED' && !cppCheck && stockCheck?.quantity === 0) {
            console.log('✅ ÉXITO TOTAL: Compra cancelada, CPP eliminada, Stock revertido.');
        } else {
            console.error('❌ FALLO LÓGICO:', { status: pCheck?.status, cpp: !!cppCheck, stock: stockCheck?.quantity });
        }

    } catch (e: any) {
        console.error('❌ EXCEPCIÓN:', e.message);
    }
}

verifyClean();
