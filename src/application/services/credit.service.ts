import { ICreditAccountRepository, ICreditPaymentRepository } from '../../core/interfaces/credit-account.repository.js';
import { ICashMovementRepository } from '../../core/interfaces/cash-movement.repository.js';
import { ICustomerRepository } from '../../core/interfaces/customer.repository.js';
import { IPurchaseRepository } from '../../core/interfaces/purchase.repository.js';
import { CreditAccount, CreditPayment, CreateCreditPaymentDto, CreditAccountStatus } from '../../core/entities/credit-account.entity.js';
import { CreateCashMovementDto } from '../../core/entities/cash-movement.entity.js';

export class CreditService {
    constructor(
        private creditAccountRepository: ICreditAccountRepository,
        private creditPaymentRepository: ICreditPaymentRepository,
        private cashMovementRepository: ICashMovementRepository,
        private customerRepository: ICustomerRepository,
        private purchaseRepository: IPurchaseRepository
    ) { }

    async registerPayment(
        creditAccountId: string,
        paymentData: CreateCreditPaymentDto,
        userId: string
    ): Promise<CreditPayment> {
        // 1. Obtener cuenta de crédito
        const creditAccount = await this.creditAccountRepository.findById(creditAccountId);
        if (!creditAccount) {
            throw new Error('Cuenta de crédito no encontrada');
        }

        if (creditAccount.status === 'PAGADO') {
            throw new Error('Esta cuenta ya está completamente pagada');
        }

        // 2. Validar que el monto no exceda el saldo
        if (paymentData.amount > creditAccount.balanceAmount) {
            throw new Error(
                `El monto del abono (C$ ${(paymentData.amount / 100).toFixed(2)}) ` +
                `excede el saldo pendiente (C$ ${(creditAccount.balanceAmount / 100).toFixed(2)})`
            );
        }

        // 3. Registrar el pago
        const payment = await this.creditPaymentRepository.create(paymentData);

        // 4. Actualizar la cuenta de crédito
        const newPaidAmount = creditAccount.paidAmount + paymentData.amount;
        const newBalanceAmount = creditAccount.totalAmount - newPaidAmount;

        let newStatus: CreditAccountStatus = creditAccount.status;
        if (newBalanceAmount === 0) {
            newStatus = 'PAGADO';
        } else if (newPaidAmount > 0) {
            newStatus = 'PAGADO_PARCIAL';
        }

        await this.creditAccountRepository.update(creditAccountId, {
            paidAmount: newPaidAmount,
            balanceAmount: newBalanceAmount,
            status: newStatus
        });

        // 5. Si es CXC, actualizar deuda del cliente
        if (creditAccount.type === 'CXC' && creditAccount.customerId) {
            const customer = await this.customerRepository.findById(creditAccount.customerId);
            if (customer) {
                await this.customerRepository.updateDebt(
                    creditAccount.customerId,
                    customer.currentDebt - paymentData.amount
                );
            }
        }

        // 6. Registrar movimiento de caja
        const cashMovementData: CreateCashMovementDto = {
            branchId: creditAccount.branchId,
            type: creditAccount.type === 'CXC' ? 'INCOME' : 'EXPENSE',
            category: 'CREDIT_PAYMENT',
            amount: paymentData.amount,
            creditAccountId: creditAccountId,
            paymentMethod: paymentData.paymentMethod,
            reference: paymentData.reference,
            description: `Abono a ${creditAccount.type} - ${creditAccountId}`,
            notes: paymentData.notes,
            createdBy: userId
        };

        await this.cashMovementRepository.create(cashMovementData);

        return payment;
    }

    async getCreditAccount(id: string): Promise<CreditAccount> {
        const account = await this.creditAccountRepository.findById(id);
        if (!account) {
            throw new Error('Cuenta de crédito no encontrada');
        }
        return account;
    }

    async listCreditAccountsByBranch(
        branchId: string,
        filters?: { type?: 'CPP' | 'CXC'; status?: 'PENDIENTE' | 'PAGADO_PARCIAL' | 'PAGADO' }
    ): Promise<CreditAccount[]> {
        return this.creditAccountRepository.findByBranch(branchId, filters);
    }

    async getPaymentHistory(creditAccountId: string): Promise<CreditPayment[]> {
        return this.creditPaymentRepository.findByCreditAccount(creditAccountId);
    }

    /**
     * Cancela una cuenta de crédito que no tenga pagos registrados
     * - Valida que no tenga pagos (paidAmount = 0)
     * - Elimina la cuenta de crédito
     * - Si es CXC, revierte la deuda del cliente
     */
    async cancelCreditAccount(creditAccountId: string): Promise<void> {
        // 1. Obtener cuenta de crédito
        const creditAccount = await this.creditAccountRepository.findById(creditAccountId);
        if (!creditAccount) {
            throw new Error('Cuenta de crédito no encontrada');
        }

        // 2. Validar que no tenga pagos registrados
        if (creditAccount.paidAmount > 0) {
            throw new Error(
                'No se puede cancelar una cuenta de crédito que ya tiene pagos registrados. ' +
                `Monto pagado: C$${(creditAccount.paidAmount / 100).toFixed(2)}`
            );
        }

        // 3. Si es CXC (Cuenta por Cobrar), revertir deuda del cliente
        if (creditAccount.type === 'CXC' && creditAccount.customerId) {
            await this.customerRepository.updateDebt(
                creditAccount.customerId,
                -creditAccount.totalAmount
            );
        }

        // 4. Eliminar la cuenta de crédito
        await this.creditAccountRepository.delete(creditAccountId);
    }
    async generateTicket(creditAccountId: string): Promise<any> {
        const creditAccount = await this.creditAccountRepository.findById(creditAccountId);
        if (!creditAccount) {
            throw new Error('Cuenta de crédito no encontrada');
        }

        if (creditAccount.type !== 'CPP') {
            throw new Error('Solo se pueden generar tickets de cuentas por pagar (CPP)');
        }

        // Obtener detalles de la compra (productos)
        let items: any[] = [];
        let purchaseDate = creditAccount.createdAt;

        if (creditAccount.purchaseId) {
            const purchase = await this.purchaseRepository.findById(creditAccount.purchaseId);
            if (purchase) {
                items = purchase.items;
                purchaseDate = purchase.createdAt;
            }
        }

        // Obtener historial de pagos
        const payments = await this.creditPaymentRepository.findByCreditAccount(creditAccountId);

        return {
            account: {
                id: creditAccount.id,
                invoiceNumber: creditAccount.invoiceNumber || 'N/A',
                status: creditAccount.status,
                dueDate: creditAccount.dueDate,
                total: creditAccount.totalAmount,
                paid: creditAccount.paidAmount,
                balance: creditAccount.balanceAmount,
                supplierName: creditAccount.supplierName || 'Proveedor Desconocido'
            },
            purchase: {
                date: purchaseDate,
                items: items.map(i => ({
                    productName: i.productName,
                    quantity: i.quantity,
                    unitCost: i.unitCost,
                    subtotal: i.subtotal
                }))
            },
            payments: payments.map(p => ({
                amount: p.amount,
                date: p.createdAt,
                method: p.paymentMethod,
                reference: p.reference
            }))
        };
    }
}
