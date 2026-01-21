import { tursoClient } from '../client.js';
import { ITransferRepository } from '../../../core/interfaces/transfer.repository.js';
import { Transfer, CreateTransferDto, TransferItem, TransferStatus } from '../../../core/entities/transfer.entity.js';

export class TransferRepositoryTurso implements ITransferRepository {
    async create(data: CreateTransferDto): Promise<Transfer> {
        const id = `TRANS-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        // Insertar transferencia principal (status inicial: PENDING)
        await tursoClient.execute({
            sql: `INSERT INTO transfers (id, from_branch_id, to_branch_id, status, notes, created_by, created_at)
                  VALUES (?, ?, ?, 'PENDING', ?, ?, ?)`,
            args: [
                id,
                data.fromBranchId,
                data.toBranchId,
                data.notes || null,
                data.createdBy,
                now
            ]
        });

        // Insertar items de la transferencia
        for (const item of data.items) {
            const itemId = `ITEM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            await tursoClient.execute({
                sql: `INSERT INTO transfer_items (id, transfer_id, product_id, product_name, quantity)
                      VALUES (?, ?, ?, ?, ?)`,
                args: [
                    itemId,
                    id,
                    item.productId,
                    item.productName,
                    item.quantity
                ]
            });
        }

        return {
            id,
            ...data,
            status: 'PENDING' as TransferStatus,
            createdAt: new Date(now)
        };
    }

    async findById(id: string): Promise<Transfer | null> {
        const transferResult = await tursoClient.execute({
            sql: 'SELECT * FROM transfers WHERE id = ?',
            args: [id]
        });

        if (transferResult.rows.length === 0) return null;

        const itemsResult = await tursoClient.execute({
            sql: 'SELECT * FROM transfer_items WHERE transfer_id = ?',
            args: [id]
        });

        return this.mapRowToTransfer(transferResult.rows[0], itemsResult.rows);
    }

    async findByBranch(branchId: string, filters?: { status?: TransferStatus }): Promise<Transfer[]> {
        let sql = 'SELECT * FROM transfers WHERE (from_branch_id = ? OR to_branch_id = ?)';
        const args: any[] = [branchId, branchId];

        if (filters?.status) {
            sql += ' AND status = ?';
            args.push(filters.status);
        }

        sql += ' ORDER BY created_at DESC';

        const transfersResult = await tursoClient.execute({ sql, args });

        const transfers: Transfer[] = [];
        for (const transferRow of transfersResult.rows) {
            const itemsResult = await tursoClient.execute({
                sql: 'SELECT * FROM transfer_items WHERE transfer_id = ?',
                args: [transferRow.id]
            });
            transfers.push(this.mapRowToTransfer(transferRow, itemsResult.rows));
        }

        return transfers;
    }

    async update(id: string, data: Partial<Transfer>): Promise<Transfer> {
        const updates: string[] = [];
        const args: any[] = [];

        if (data.status !== undefined) {
            updates.push('status = ?');
            args.push(data.status);
        }
        if (data.approvedBy !== undefined) {
            updates.push('approved_by = ?');
            args.push(data.approvedBy);
        }
        if (data.approvedAt !== undefined) {
            updates.push('approved_at = ?');
            args.push(data.approvedAt.toISOString());
        }
        if (data.completedBy !== undefined) {
            updates.push('completed_by = ?');
            args.push(data.completedBy);
        }
        if (data.completedAt !== undefined) {
            updates.push('completed_at = ?');
            args.push(data.completedAt.toISOString());
        }

        if (updates.length === 0) {
            const current = await this.findById(id);
            if (!current) throw new Error('Transferencia no encontrada');
            return current;
        }

        args.push(id);

        await tursoClient.execute({
            sql: `UPDATE transfers SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Transferencia no encontrada después de actualizar');
        return updated;
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM transfers WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToTransfer(transferRow: any, itemRows: any[]): Transfer {
        const items: TransferItem[] = itemRows.map(row => ({
            productId: row.product_id as string,
            productName: row.product_name as string,
            quantity: Number(row.quantity)
        }));

        return {
            id: transferRow.id as string,
            fromBranchId: transferRow.from_branch_id as string,
            toBranchId: transferRow.to_branch_id as string,
            items,
            status: transferRow.status as TransferStatus,
            notes: transferRow.notes as string | undefined,
            createdBy: transferRow.created_by as string,
            approvedBy: transferRow.approved_by as string | undefined,
            completedBy: transferRow.completed_by as string | undefined,
            createdAt: new Date(transferRow.created_at as string),
            approvedAt: transferRow.approved_at ? new Date(transferRow.approved_at as string) : undefined,
            completedAt: transferRow.completed_at ? new Date(transferRow.completed_at as string) : undefined
        };
    }
}
