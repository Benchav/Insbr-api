import { tursoClient } from '../client.js';
import { IPurchaseRepository } from '../../../core/interfaces/purchase.repository.js';
import { Purchase, CreatePurchaseDto, PurchaseItem } from '../../../core/entities/purchase.entity.js';

export class PurchaseRepositoryTurso implements IPurchaseRepository {
    async create(data: CreatePurchaseDto): Promise<Purchase> {
        const id = `PURCH-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        // Insertar compra principal
        await tursoClient.execute({
            sql: `INSERT INTO purchases (id, branch_id, supplier_id, subtotal, tax, discount, total, type, payment_method, invoice_number, notes, created_by, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                data.branchId,
                data.supplierId,
                data.subtotal,
                data.tax,
                data.discount,
                data.total,
                data.type,
                data.paymentMethod || null,
                data.invoiceNumber || null,
                data.notes || null,
                data.createdBy,
                now
            ]
        });

        // Insertar items de la compra
        for (const item of data.items) {
            const itemId = `ITEM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            await tursoClient.execute({
                sql: `INSERT INTO purchase_items (id, purchase_id, product_id, product_name, quantity, unit_cost, subtotal)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    itemId,
                    id,
                    item.productId,
                    item.productName,
                    item.quantity,
                    item.unitCost,
                    item.subtotal
                ]
            });
        }

        return {
            id,
            ...data,
            createdAt: new Date(now)
        };
    }

    async findById(id: string): Promise<Purchase | null> {
        const purchaseResult = await tursoClient.execute({
            sql: 'SELECT * FROM purchases WHERE id = ?',
            args: [id]
        });

        if (purchaseResult.rows.length === 0) return null;

        const itemsResult = await tursoClient.execute({
            sql: 'SELECT * FROM purchase_items WHERE purchase_id = ?',
            args: [id]
        });

        return this.mapRowToPurchase(purchaseResult.rows[0], itemsResult.rows);
    }

    async findByBranch(
        branchId: string,
        filters?: { startDate?: Date; endDate?: Date; supplierId?: string }
    ): Promise<Purchase[]> {
        let sql = 'SELECT * FROM purchases WHERE branch_id = ?';
        const args: any[] = [branchId];

        if (filters?.startDate) {
            sql += ' AND created_at >= ?';
            args.push(filters.startDate.toISOString());
        }

        if (filters?.endDate) {
            sql += ' AND created_at <= ?';
            args.push(filters.endDate.toISOString());
        }

        if (filters?.supplierId) {
            sql += ' AND supplier_id = ?';
            args.push(filters.supplierId);
        }

        sql += ' ORDER BY created_at DESC';

        const purchasesResult = await tursoClient.execute({ sql, args });

        const purchases: Purchase[] = [];
        for (const purchaseRow of purchasesResult.rows) {
            const itemsResult = await tursoClient.execute({
                sql: 'SELECT * FROM purchase_items WHERE purchase_id = ?',
                args: [purchaseRow.id]
            });
            purchases.push(this.mapRowToPurchase(purchaseRow, itemsResult.rows));
        }

        return purchases;
    }

    async findBySupplier(supplierId: string): Promise<Purchase[]> {
        const purchasesResult = await tursoClient.execute({
            sql: 'SELECT * FROM purchases WHERE supplier_id = ? ORDER BY created_at DESC',
            args: [supplierId]
        });

        const purchases: Purchase[] = [];
        for (const purchaseRow of purchasesResult.rows) {
            const itemsResult = await tursoClient.execute({
                sql: 'SELECT * FROM purchase_items WHERE purchase_id = ?',
                args: [purchaseRow.id]
            });
            purchases.push(this.mapRowToPurchase(purchaseRow, itemsResult.rows));
        }

        return purchases;
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM purchases WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToPurchase(purchaseRow: any, itemRows: any[]): Purchase {
        const items: PurchaseItem[] = itemRows.map(row => ({
            productId: row.product_id as string,
            productName: row.product_name as string,
            quantity: Number(row.quantity),
            unitCost: Number(row.unit_cost),
            subtotal: Number(row.subtotal)
        }));

        return {
            id: purchaseRow.id as string,
            branchId: purchaseRow.branch_id as string,
            supplierId: purchaseRow.supplier_id as string,
            items,
            subtotal: Number(purchaseRow.subtotal),
            tax: Number(purchaseRow.tax),
            discount: Number(purchaseRow.discount),
            total: Number(purchaseRow.total),
            type: purchaseRow.type as 'CASH' | 'CREDIT',
            paymentMethod: purchaseRow.payment_method as 'CASH' | 'TRANSFER' | 'CHECK' | undefined,
            invoiceNumber: purchaseRow.invoice_number as string | undefined,
            notes: purchaseRow.notes as string | undefined,
            createdBy: purchaseRow.created_by as string,
            createdAt: new Date(purchaseRow.created_at as string)
        };
    }
}
