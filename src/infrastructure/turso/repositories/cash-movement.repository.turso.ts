import { tursoClient } from '../client.js';
import { ICashMovementRepository } from '../../../core/interfaces/cash-movement.repository.js';
import { CashMovement, CreateCashMovementDto, CashMovementType } from '../../../core/entities/cash-movement.entity.js';

export class CashMovementRepositoryTurso implements ICashMovementRepository {
    async create(data: CreateCashMovementDto): Promise<CashMovement> {
        const id = `CASH-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO cash_movements (id, branch_id, type, category, amount, sale_id, purchase_id, credit_account_id, payment_method, reference, description, notes, created_by, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                data.branchId,
                data.type,
                data.category,
                data.amount,
                data.saleId || null,
                data.purchaseId || null,
                data.creditAccountId || null,
                data.paymentMethod,
                data.reference || null,
                data.description,
                data.notes || null,
                data.createdBy,
                now
            ]
        });

        return {
            id,
            ...data,
            createdAt: new Date(now)
        };
    }

    async findById(id: string): Promise<CashMovement | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM cash_movements WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToCashMovement(result.rows[0]);
    }

    async findByBranch(
        branchId: string,
        filters?: { type?: CashMovementType; startDate?: Date; endDate?: Date }
    ): Promise<CashMovement[]> {
        let sql = 'SELECT * FROM cash_movements WHERE branch_id = ?';
        const args: any[] = [branchId];

        if (filters?.type) {
            sql += ' AND type = ?';
            args.push(filters.type);
        }

        if (filters?.startDate) {
            sql += ' AND created_at >= ?';
            args.push(filters.startDate.toISOString());
        }

        if (filters?.endDate) {
            sql += ' AND created_at <= ?';
            args.push(filters.endDate.toISOString());
        }

        sql += ' ORDER BY created_at DESC';

        const result = await tursoClient.execute({ sql, args });
        return result.rows.map(row => this.mapRowToCashMovement(row));
    }

    async getBalance(branchId: string): Promise<number> {
        const result = await tursoClient.execute({
            sql: `SELECT 
                    SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END) - 
                    SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END) as balance
                  FROM cash_movements 
                  WHERE branch_id = ?`,
            args: [branchId]
        });

        return Number(result.rows[0]?.balance || 0);
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM cash_movements WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToCashMovement(row: any): CashMovement {
        return {
            id: row.id as string,
            branchId: row.branch_id as string,
            type: row.type as 'INCOME' | 'EXPENSE',
            category: row.category as any,
            amount: Number(row.amount),
            saleId: row.sale_id as string | undefined,
            purchaseId: row.purchase_id as string | undefined,
            creditAccountId: row.credit_account_id as string | undefined,
            paymentMethod: row.payment_method as 'CASH' | 'TRANSFER' | 'CHECK',
            reference: row.reference as string | undefined,
            description: row.description as string,
            notes: row.notes as string | undefined,
            createdBy: row.created_by as string,
            createdAt: new Date(row.created_at as string)
        };
    }
}
