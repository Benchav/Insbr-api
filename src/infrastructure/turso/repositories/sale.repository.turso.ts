import { tursoClient } from '../client.js';
import { ISaleRepository } from '../../../core/interfaces/sale.repository.js';
import { Sale, CreateSaleDto, SaleItem } from '../../../core/entities/sale.entity.js';

export class SaleRepositoryTurso implements ISaleRepository {
    async create(data: CreateSaleDto): Promise<Sale> {
        const id = `SALE-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        // Insertar venta principal
        await tursoClient.execute({
            sql: `INSERT INTO sales (id, branch_id, customer_id, subtotal, tax, discount, total, type, payment_method, notes, created_by, created_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                data.branchId,
                data.customerId || null,
                data.subtotal,
                data.tax,
                data.discount,
                data.total,
                data.type,
                data.paymentMethod || null,
                data.notes || null,
                data.createdBy,
                now
            ]
        });

        // Insertar items de la venta
        for (const item of data.items) {
            const itemId = `ITEM-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            await tursoClient.execute({
                sql: `INSERT INTO sale_items (id, sale_id, product_id, product_name, quantity, unit_price, subtotal)
                      VALUES (?, ?, ?, ?, ?, ?, ?)`,
                args: [
                    itemId,
                    id,
                    item.productId,
                    item.productName,
                    item.quantity,
                    item.unitPrice,
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

    async findById(id: string): Promise<Sale | null> {
        // Obtener venta
        const saleResult = await tursoClient.execute({
            sql: 'SELECT * FROM sales WHERE id = ?',
            args: [id]
        });

        if (saleResult.rows.length === 0) return null;

        // Obtener items
        const itemsResult = await tursoClient.execute({
            sql: 'SELECT * FROM sale_items WHERE sale_id = ?',
            args: [id]
        });

        return this.mapRowToSale(saleResult.rows[0], itemsResult.rows);
    }

    async findByBranch(
        branchId: string,
        filters?: { startDate?: Date; endDate?: Date; customerId?: string }
    ): Promise<Sale[]> {
        let sql = 'SELECT * FROM sales WHERE branch_id = ?';
        const args: any[] = [branchId];

        if (filters?.startDate) {
            sql += ' AND created_at >= ?';
            args.push(filters.startDate.toISOString());
        }

        if (filters?.endDate) {
            sql += ' AND created_at <= ?';
            args.push(filters.endDate.toISOString());
        }

        if (filters?.customerId) {
            sql += ' AND customer_id = ?';
            args.push(filters.customerId);
        }

        sql += ' ORDER BY created_at DESC';

        const salesResult = await tursoClient.execute({ sql, args });

        // Obtener items para todas las ventas
        const sales: Sale[] = [];
        for (const saleRow of salesResult.rows) {
            const itemsResult = await tursoClient.execute({
                sql: 'SELECT * FROM sale_items WHERE sale_id = ?',
                args: [saleRow.id]
            });
            sales.push(this.mapRowToSale(saleRow, itemsResult.rows));
        }

        return sales;
    }

    async findByCustomer(customerId: string): Promise<Sale[]> {
        const salesResult = await tursoClient.execute({
            sql: 'SELECT * FROM sales WHERE customer_id = ? ORDER BY created_at DESC',
            args: [customerId]
        });

        const sales: Sale[] = [];
        for (const saleRow of salesResult.rows) {
            const itemsResult = await tursoClient.execute({
                sql: 'SELECT * FROM sale_items WHERE sale_id = ?',
                args: [saleRow.id]
            });
            sales.push(this.mapRowToSale(saleRow, itemsResult.rows));
        }

        return sales;
    }

    async delete(id: string): Promise<void> {
        // Los items se eliminan automáticamente por ON DELETE CASCADE
        await tursoClient.execute({
            sql: 'DELETE FROM sales WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToSale(saleRow: any, itemRows: any[]): Sale {
        const items: SaleItem[] = itemRows.map(row => ({
            productId: row.product_id as string,
            productName: row.product_name as string,
            quantity: Number(row.quantity),
            unitPrice: Number(row.unit_price),
            subtotal: Number(row.subtotal)
        }));

        return {
            id: saleRow.id as string,
            branchId: saleRow.branch_id as string,
            customerId: saleRow.customer_id as string | undefined,
            items,
            subtotal: Number(saleRow.subtotal),
            tax: Number(saleRow.tax),
            discount: Number(saleRow.discount),
            total: Number(saleRow.total),
            type: saleRow.type as 'CASH' | 'CREDIT',
            paymentMethod: saleRow.payment_method as 'CASH' | 'TRANSFER' | 'CHECK' | undefined,
            notes: saleRow.notes as string | undefined,
            createdBy: saleRow.created_by as string,
            createdAt: new Date(saleRow.created_at as string)
        };
    }
}
