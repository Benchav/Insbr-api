import 'dotenv/config';
import { PurchaseService } from './src/application/services/purchase.service.js';
import { CreditService } from './src/application/services/credit.service.js';
import { PurchaseRepositoryTurso } from './src/infrastructure/turso/repositories/purchase.repository.turso.js';
import { StockRepositoryTurso } from './src/infrastructure/turso/repositories/stock.repository.turso.js';
import { SupplierRepositoryTurso } from './src/infrastructure/turso/repositories/supplier.repository.turso.js';
import { CreditAccountRepositoryTurso, CreditPaymentRepositoryTurso } from './src/infrastructure/turso/repositories/credit-account.repository.turso.js';
// import { CreditPaymentRepositoryTurso } from './src/infrastructure/turso/repositories/credit-payment.repository.turso.js';  <-- Removed
import { CashMovementRepositoryTurso } from './src/infrastructure/turso/repositories/cash-movement.repository.turso.js';
import { CustomerRepositoryTurso } from './src/infrastructure/turso/repositories/customer.repository.turso.js';
import { BranchRepositoryTurso } from './src/infrastructure/turso/repositories/branch.repository.turso.js';
import { ProductRepositoryTurso } from './src/infrastructure/turso/repositories/product.repository.turso.js';
import { UserRepositoryTurso } from './src/infrastructure/turso/repositories/user.repository.turso.js';
import { User } from './src/core/entities/user.entity.js';
import { tursoClient } from './src/infrastructure/turso/client.js';

async function verifyCppPayment() {
    console.log('🚀 Iniciando Verificación de Pagos CPP...');

    // Repos
    const purchaseRepo = new PurchaseRepositoryTurso();
    const stockRepo = new StockRepositoryTurso();
    const supplierRepo = new SupplierRepositoryTurso();
    const creditRepo = new CreditAccountRepositoryTurso();
    const paymentRepo = new CreditPaymentRepositoryTurso();
    const cashRepo = new CashMovementRepositoryTurso();
    const customerRepo = new CustomerRepositoryTurso();
    const branchRepo = new BranchRepositoryTurso();
    const productRepo = new ProductRepositoryTurso();
    const userRepo = new UserRepositoryTurso();

    // Services
    const purchaseService = new PurchaseService(purchaseRepo, stockRepo, supplierRepo, creditRepo, cashRepo);
    const creditService = new CreditService(creditRepo, paymentRepo, cashRepo, customerRepo);

    // Context IDs
    let purchaseId, supplierId, productId, branchId, userId, creditAccountId;

    try {
        // 1. Setup Data
        const branches = await branchRepo.findAll();
        branchId = branches.length > 0 ? branches[0].id : (await branchRepo.create({ name: 'TestB', code: `B${Date.now()}`, address: 'X', phone: 'X', isActive: true })).id;

        const users = await userRepo.findAll();
        userId = users.length > 0 ? users[0].id : (await userRepo.create({ id: `U${Date.now()}`, username: `u${Date.now()}`, password: 'x', name: 'T', role: 'ADMIN', branchId, isActive: true, createdAt: new Date(), updatedAt: new Date() } as User)).id;

        const prod = await productRepo.create({ name: `P${Date.now()}`, description: 'D', sku: `S${Date.now()}`, category: 'C', costPrice: 100, retailPrice: 200, wholesalePrice: 150, unit: 'U', isActive: true });
        productId = prod.id;

        const supp = await supplierRepo.create({ name: `SUP${Date.now()}`, contactName: 'C', phone: 'P', address: 'A', creditDays: 30, creditLimit: 20000, isActive: true });
        supplierId = supp.id;

        // 2. Crear Compra a Crédito (Total: 1000)
        console.log('2. Registrando Compra a Crédito (C$ 1000)...');
        const purchase = await purchaseService.createPurchase({
            branchId, supplierId,
            items: [{ productId, productName: prod.name, quantity: 10, unitCost: 100, subtotal: 1000 }],
            subtotal: 1000, tax: 0, discount: 0, total: 1000, type: 'CREDIT', createdBy: userId, invoiceNumber: 'INV-PAY', status: 'COMPLETED'
        });
        purchaseId = purchase.id;

        // 3. Verificar CPP creada
        const cppList = await creditRepo.findByBranch(branchId);
        const cpp = cppList.find(c => c.purchaseId === purchaseId);
        if (!cpp) throw new Error('No se creó la cuenta por pagar (CPP)');
        creditAccountId = cpp.id;

        if (cpp.balanceAmount !== 1000 || cpp.status !== 'PENDIENTE') throw new Error(`Estado inicial incorrecto: Balance ${cpp.balanceAmount}, Status ${cpp.status}`);
        console.log('✅ CPP creada correctamente.');


        // 4. Registrar Abono Parcial (400)
        console.log('4. Registrando Abono Parcial (C$ 400)...');
        await creditService.registerPayment(cpp.id, {
            creditAccountId: cpp.id,
            amount: 400,
            paymentMethod: 'CASH',
            notes: 'Abono 1'
        }, userId);

        const cppPartial = await creditRepo.findById(cpp.id);
        if (cppPartial?.balanceAmount !== 600 || cppPartial?.status !== 'PAGADO_PARCIAL') throw new Error(`Estado parcial incorrecto: Balance ${cppPartial?.balanceAmount}`);
        console.log('✅ Abono parcial registrado correctamente.');


        // 5. Registrar Cancelación Total (600)
        console.log('5. Cancelando saldo restante (C$ 600)...');
        await creditService.registerPayment(cpp.id, {
            creditAccountId: cpp.id,
            amount: 600,
            paymentMethod: 'CASH',
            notes: 'Cancelación'
        }, userId);

        const cppPaid = await creditRepo.findById(cpp.id);
        if (cppPaid?.balanceAmount !== 0 || cppPaid?.status !== 'PAGADO') throw new Error(`Estado final incorrecto: Balance ${cppPaid?.balanceAmount}, Status ${cppPaid?.status}`);
        console.log('✅ Deuda cancelada totalmente.');

        console.log('✅ ÉXITO: Flujo de Compras y Pagos verificado.');

    } catch (e: any) {
        console.error('❌ FALLO:', e.message);
        console.error(e);
    } finally {
        // Cleanup
        try {
            if (creditAccountId) {
                // Delete payments
                await tursoClient.execute({ sql: 'DELETE FROM credit_payments WHERE credit_account_id = ?', args: [creditAccountId] });
                // Delete CPP
                await creditRepo.delete(creditAccountId);
            }
            if (purchaseId) {
                await tursoClient.execute({ sql: 'DELETE FROM purchase_items WHERE purchase_id = ?', args: [purchaseId] });
                await purchaseRepo.delete(purchaseId);
            }
            if (supplierId) await supplierRepo.delete(supplierId);
            if (productId) await productRepo.delete(productId);
        } catch (cleanupErr) {
            console.warn('⚠️ Error en limpieza:', cleanupErr);
        }
    }
}

verifyCppPayment();
