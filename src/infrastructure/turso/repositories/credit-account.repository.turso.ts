import { tursoClient } from '../client.js';
import { ICreditAccountRepository, ICreditPaymentRepository } from '../../../core/interfaces/credit-account.repository.js';
import {
    CreditAccount,
    CreditPayment,
    CreateCreditAccountDto,
    CreateCreditPaymentDto,
    CreditAccountType,
    CreditAccountStatus
} from '../../../core/entities/credit-account.entity.js';

export class CreditAccountRepositoryTurso implements ICreditAccountRepository {
    async create(data: CreateCreditAccountDto): Promise<CreditAccount> {
        const id = `CREDIT-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        // Valores por defecto para nueva cuenta de crédito
        const paidAmount = 0;
        const balanceAmount = data.totalAmount;
        const status: CreditAccountStatus = 'PENDIENTE';

        await tursoClient.execute({
            sql: `INSERT INTO credit_accounts (id, type, branch_id, supplier_id, customer_id, purchase_id, sale_id, total_amount, paid_amount, balance_amount, status, due_date, delivery_date, notes, invoice_number, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                data.type,
                data.branchId,
                data.supplierId || null,
                data.customerId || null,
                data.purchaseId || null,
                data.saleId || null,
                data.totalAmount,
                paidAmount,
                balanceAmount,
                status,
                data.dueDate.toISOString(),
                data.deliveryDate ? data.deliveryDate.toISOString() : null,
                data.notes || null,
                data.invoiceNumber || null,
                now,
                now
            ]
        });

        return {
            id,
            ...data,
            paidAmount,
            balanceAmount,
            status,
            createdAt: new Date(now),
            updatedAt: new Date(now)
        };
    }

    async findById(id: string): Promise<CreditAccount | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM credit_accounts WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToCreditAccount(result.rows[0]);
    }

    async findByBranch(
        branchId: string,
        filters?: { type?: CreditAccountType; status?: CreditAccountStatus }
    ): Promise<CreditAccount[]> {
        let sql = 'SELECT * FROM credit_accounts WHERE branch_id = ?';
        const args: any[] = [branchId];

        if (filters?.type) {
            sql += ' AND type = ?';
            args.push(filters.type);
        }

        if (filters?.status) {
            sql += ' AND status = ?';
            args.push(filters.status);
        }

        sql += ' ORDER BY created_at DESC';

        const result = await tursoClient.execute({ sql, args });
        return result.rows.map(row => this.mapRowToCreditAccount(row));
    }

    async findBySupplier(supplierId: string): Promise<CreditAccount[]> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM credit_accounts WHERE supplier_id = ? ORDER BY created_at DESC',
            args: [supplierId]
        });

        return result.rows.map(row => this.mapRowToCreditAccount(row));
    }

    async findByCustomer(customerId: string): Promise<CreditAccount[]> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM credit_accounts WHERE customer_id = ? ORDER BY created_at DESC',
            args: [customerId]
        });

        return result.rows.map(row => this.mapRowToCreditAccount(row));
    }

    async update(id: string, data: Partial<CreditAccount>): Promise<CreditAccount> {
        const updates: string[] = [];
        const args: any[] = [];

        if (data.paidAmount !== undefined) {
            updates.push('paid_amount = ?');
            args.push(data.paidAmount);
        }
        if (data.balanceAmount !== undefined) {
            updates.push('balance_amount = ?');
            args.push(data.balanceAmount);
        }
        if (data.status !== undefined) {
            updates.push('status = ?');
            args.push(data.status);
        }
        if (data.deliveryDate !== undefined) {
            updates.push('delivery_date = ?');
            args.push(data.deliveryDate ? data.deliveryDate.toISOString() : null);
        }
        if (data.notes !== undefined) {
            updates.push('notes = ?');
            args.push(data.notes || null);
        }
        if (data.invoiceNumber !== undefined) {
            updates.push('invoice_number = ?');
            args.push(data.invoiceNumber || null);
        }

        updates.push('updated_at = ?');
        args.push(new Date().toISOString());
        args.push(id);

        await tursoClient.execute({
            sql: `UPDATE credit_accounts SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Cuenta de crédito no encontrada después de actualizar');
        return updated;
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM credit_accounts WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToCreditAccount(row: any): CreditAccount {
        return {
            id: row.id as string,
            type: row.type as 'CPP' | 'CXC',
            branchId: row.branch_id as string,
            supplierId: row.supplier_id as string | undefined,
            customerId: row.customer_id as string | undefined,
            purchaseId: row.purchase_id as string | undefined,
            saleId: row.sale_id as string | undefined,
            totalAmount: Number(row.total_amount),
            paidAmount: Number(row.paid_amount),
            balanceAmount: Number(row.balance_amount),
            status: row.status as 'PENDIENTE' | 'PAGADO_PARCIAL' | 'PAGADO',
            dueDate: new Date(row.due_date as string),
            deliveryDate: row.delivery_date ? new Date(row.delivery_date as string) : undefined,
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string),
            notes: row.notes as string | undefined,
            invoiceNumber: row.invoice_number as string | undefined
        };
    }
}

export class CreditPaymentRepositoryTurso implements ICreditPaymentRepository {
    async create(data: CreateCreditPaymentDto): Promise<CreditPayment> {
        const id = `PAY-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO credit_payments (id, credit_account_id, amount, payment_method, reference, notes, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                data.creditAccountId,
                data.amount,
                data.paymentMethod,
                data.reference || null,
                data.notes || null,
                now
            ]
        });

        return {
            id,
            ...data,
            createdAt: new Date(now)
        };
    }

    async findById(id: string): Promise<CreditPayment | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM credit_payments WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToCreditPayment(result.rows[0]);
    }

    async findByCreditAccount(creditAccountId: string): Promise<CreditPayment[]> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM credit_payments WHERE credit_account_id = ? ORDER BY created_at DESC',
            args: [creditAccountId]
        });

        return result.rows.map(row => this.mapRowToCreditPayment(row));
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM credit_payments WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToCreditPayment(row: any): CreditPayment {
        return {
            id: row.id as string,
            creditAccountId: row.credit_account_id as string,
            amount: Number(row.amount),
            paymentMethod: row.payment_method as 'CASH' | 'TRANSFER' | 'CHECK',
            reference: row.reference as string | undefined,
            notes: row.notes as string | undefined,
            createdAt: new Date(row.created_at as string)
        };
    }
}
