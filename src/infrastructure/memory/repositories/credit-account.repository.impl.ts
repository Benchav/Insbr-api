import {
    ICreditAccountRepository,
    ICreditPaymentRepository
} from '../../../core/interfaces/credit-account.repository.js';
import {
    CreditAccount,
    CreditPayment,
    CreateCreditAccountDto,
    CreateCreditPaymentDto,
    CreditAccountType,
    CreditAccountStatus
} from '../../../core/entities/credit-account.entity.js';
import { storage } from '../storage.js';
import { randomUUID } from 'crypto';

export class CreditAccountRepositoryImpl implements ICreditAccountRepository {
    async create(data: CreateCreditAccountDto): Promise<CreditAccount> {
        const account: CreditAccount = {
            id: randomUUID(),
            ...data,
            paidAmount: 0,
            balanceAmount: data.totalAmount,
            status: 'PENDIENTE',
            createdAt: new Date(),
            updatedAt: new Date()
        };

        storage.creditAccounts.set(account.id, account);
        return account;
    }

    async findById(id: string): Promise<CreditAccount | null> {
        return storage.creditAccounts.get(id) || null;
    }

    async findByBranch(
        branchId: string,
        filters?: { type?: CreditAccountType; status?: CreditAccountStatus }
    ): Promise<CreditAccount[]> {
        let accounts = Array.from(storage.creditAccounts.values())
            .filter(a => a.branchId === branchId);

        if (filters?.type) {
            accounts = accounts.filter(a => a.type === filters.type);
        }

        if (filters?.status) {
            accounts = accounts.filter(a => a.status === filters.status);
        }

        return accounts;
    }

    async findBySupplier(supplierId: string): Promise<CreditAccount[]> {
        return Array.from(storage.creditAccounts.values())
            .filter(a => a.supplierId === supplierId);
    }

    async findByCustomer(customerId: string): Promise<CreditAccount[]> {
        return Array.from(storage.creditAccounts.values())
            .filter(a => a.customerId === customerId);
    }

    async update(id: string, data: Partial<CreditAccount>): Promise<CreditAccount> {
        const account = await this.findById(id);
        if (!account) {
            throw new Error('Cuenta de crédito no encontrada');
        }

        const updated: CreditAccount = {
            ...account,
            ...data,
            updatedAt: new Date()
        };

        storage.creditAccounts.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        storage.creditAccounts.delete(id);
    }
}

export class CreditPaymentRepositoryImpl implements ICreditPaymentRepository {
    async create(data: CreateCreditPaymentDto): Promise<CreditPayment> {
        const payment: CreditPayment = {
            id: randomUUID(),
            ...data,
            createdAt: new Date()
        };

        storage.creditPayments.set(payment.id, payment);
        return payment;
    }

    async findById(id: string): Promise<CreditPayment | null> {
        return storage.creditPayments.get(id) || null;
    }

    async findByCreditAccount(creditAccountId: string): Promise<CreditPayment[]> {
        return Array.from(storage.creditPayments.values())
            .filter(p => p.creditAccountId === creditAccountId)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    }

    async delete(id: string): Promise<void> {
        storage.creditPayments.delete(id);
    }
}
