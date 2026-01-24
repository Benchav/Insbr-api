import 'dotenv/config';
import { PurchaseService } from './src/application/services/purchase.service.js';
import { CreditService } from './src/application/services/credit.service.js';
import { PurchaseRepositoryTurso } from './src/infrastructure/turso/repositories/purchase.repository.turso.js';
import { StockRepositoryTurso } from './src/infrastructure/turso/repositories/stock.repository.turso.js';
import { SupplierRepositoryTurso } from './src/infrastructure/turso/repositories/supplier.repository.turso.js';
import { CreditAccountRepositoryTurso, CreditPaymentRepositoryTurso } from './src/infrastructure/turso/repositories/credit-account.repository.turso.js';
import { CashMovementRepositoryTurso } from './src/infrastructure/turso/repositories/cash-movement.repository.turso.js';
import { CustomerRepositoryTurso } from './src/infrastructure/turso/repositories/customer.repository.turso.js';
import { BranchRepositoryTurso } from './src/infrastructure/turso/repositories/branch.repository.turso.js';
import { ProductRepositoryTurso } from './src/infrastructure/turso/repositories/product.repository.turso.js';
import { UserRepositoryTurso } from './src/infrastructure/turso/repositories/user.repository.turso.js';
import { User } from './src/core/entities/user.entity.js';
import { tursoClient } from './src/infrastructure/turso/client.js';

async function verifyTicket() {
    console.log('🚀 Iniciando Verificación de Ticket CPP...');

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

    const purchaseService = new PurchaseService(purchaseRepo, stockRepo, supplierRepo, creditRepo, cashRepo);
    const creditService = new CreditService(creditRepo, paymentRepo, cashRepo, customerRepo, purchaseRepo);

    let purchaseId, supplierId, productId;

    try {
        // Setup
        const branches = await branchRepo.findAll();
        const branchId = branches.length > 0 ? branches[0].id : (await branchRepo.create({ name: 'TB', code: `B${Date.now()}`, address: 'X', phone: 'X', isActive: true })).id;

        const users = await userRepo.findAll();
        const userId = users.length > 0 ? users[0].id : (await userRepo.create({ id: `U${Date.now()}`, username: `u${Date.now()}`, password: 'x', name: 'T', role: 'ADMIN', branchId, isActive: true, createdAt: new Date(), updatedAt: new Date() } as User)).id;

        const prod = await productRepo.create({ name: `P${Date.now()}`, description: 'D', sku: `S${Date.now()}`, category: 'C', costPrice: 100, retailPrice: 200, wholesalePrice: 150, unit: 'U', isActive: true });
        productId = prod.id;

        const supp = await supplierRepo.create({ name: `SUP${Date.now()}`, contactName: 'C', phone: 'P', address: 'A', creditDays: 30, creditLimit: 20000, isActive: true });
        supplierId = supp.id;

        // Create Purchase (Credit)
        console.log('1. Creando Compra...');
        const purchase = await purchaseService.createPurchase({
            branchId, supplierId,
            items: [{ productId, productName: prod.name, quantity: 2, unitCost: 100, subtotal: 200 }],
            subtotal: 200, tax: 0, discount: 0, total: 200, type: 'CREDIT', createdBy: userId, invoiceNumber: 'INV-TICKET', status: 'COMPLETED'
        });
        purchaseId = purchase.id;

        // Get info to find CPP
        const cppList = await creditRepo.findByBranch(branchId);
        const cpp = cppList.find(c => c.purchaseId === purchaseId);
        if (!cpp) throw new Error('CPP no encontrada');

        // Add a payment
        console.log('2. Agregando Pago...');
        await creditService.registerPayment(cpp.id, { creditAccountId: cpp.id, amount: 50, paymentMethod: 'CASH', notes: 'Abono Ticket' }, userId);

        // Generate Ticket
        console.log('3. Generando Ticket...');
        const ticket = await creditService.generateTicket(cpp.id);

        // Assertions
        console.log('   Validando estructura...');
        if (ticket.account.id !== cpp.id) throw new Error('ID de cuenta incorrecto');
        if (ticket.account.supplierName !== supp.name) throw new Error(`Nombre de proveedor incorrecto. Esperado: ${supp.name}, Recibido: ${ticket.account.supplierName}`);
        if (ticket.purchase.items.length !== 1) throw new Error('Items de compra incorrectos');
        if (ticket.payments.length !== 1) throw new Error('Pagos incorrectos');
        if (ticket.account.balance !== 150) throw new Error('Balance incorrecto');

        console.log('✅ Ticket generado y validado correctamente.');

    } catch (e: any) {
        console.error('❌ FALLO DETALLADO:');
        console.error(e.message);
        console.error(e.stack);
        process.exit(1);
    } finally {
        try {
            if (purchaseId) {
                // Cleanup using direct SQL to avoid FK constraints if standard delete fails
                if (supplierId) await supplierRepo.delete(supplierId);
                if (productId) await productRepo.delete(productId);
                await tursoClient.execute({ sql: 'DELETE FROM credit_payments WHERE credit_account_id IN (SELECT id FROM credit_accounts WHERE purchase_id = ?)', args: [purchaseId] });
                await tursoClient.execute({ sql: 'DELETE FROM credit_accounts WHERE purchase_id = ?', args: [purchaseId] });
                await tursoClient.execute({ sql: 'DELETE FROM purchase_items WHERE purchase_id = ?', args: [purchaseId] });
                await purchaseRepo.delete(purchaseId);
            }
        } catch (e) { }
    }
}

verifyTicket();
