import { tursoClient } from '../client.js';
import { IStockRepository } from '../../../core/interfaces/stock.repository.js';
import { Stock, CreateStockDto, UpdateStockDto } from '../../../core/entities/stock.entity.js';

export class StockRepositoryTurso implements IStockRepository {
    async create(data: CreateStockDto): Promise<Stock> {
        const id = `STOCK-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO stock (id, product_id, branch_id, quantity, min_stock, max_stock, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?)`,
            args: [id, data.productId, data.branchId, data.quantity, data.minStock, data.maxStock, now]
        });

        return {
            id,
            ...data,
            updatedAt: new Date(now)
        };
    }

    async findById(id: string): Promise<Stock | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM stock WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToStock(result.rows[0]);
    }

    async findByProductAndBranch(productId: string, branchId: string): Promise<Stock | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM stock WHERE product_id = ? AND branch_id = ?',
            args: [productId, branchId]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToStock(result.rows[0]);
    }

    async findByBranch(branchId: string): Promise<Stock[]> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM stock WHERE branch_id = ? ORDER BY product_id',
            args: [branchId]
        });

        return result.rows.map(row => this.mapRowToStock(row));
    }

    async findByProduct(productId: string): Promise<Stock[]> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM stock WHERE product_id = ? ORDER BY branch_id',
            args: [productId]
        });

        return result.rows.map(row => this.mapRowToStock(row));
    }

    async update(id: string, data: UpdateStockDto): Promise<Stock> {
        const updates: string[] = [];
        const args: any[] = [];

        if (data.quantity !== undefined) {
            updates.push('quantity = ?');
            args.push(data.quantity);
        }
        if (data.minStock !== undefined) {
            updates.push('min_stock = ?');
            args.push(data.minStock);
        }
        if (data.maxStock !== undefined) {
            updates.push('max_stock = ?');
            args.push(data.maxStock);
        }

        updates.push('updated_at = ?');
        args.push(new Date().toISOString());
        args.push(id);

        await tursoClient.execute({
            sql: `UPDATE stock SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Stock no encontrado después de actualizar');
        return updated;
    }

    async updateQuantity(id: string, quantity: number): Promise<Stock> {
        await tursoClient.execute({
            sql: 'UPDATE stock SET quantity = ?, updated_at = ? WHERE id = ?',
            args: [quantity, new Date().toISOString(), id]
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Stock no encontrado después de actualizar');
        return updated;
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM stock WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToStock(row: any): Stock {
        return {
            id: row.id as string,
            productId: row.product_id as string,
            branchId: row.branch_id as string,
            quantity: Number(row.quantity),
            minStock: Number(row.min_stock),
            maxStock: Number(row.max_stock),
            updatedAt: new Date(row.updated_at as string)
        };
    }
}
