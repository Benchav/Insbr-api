import { tursoClient } from '../client.js';
import { IProductRepository } from '../../../core/interfaces/product.repository.js';
import { Product, CreateProductDto, UpdateProductDto } from '../../../core/entities/product.entity.js';

export class ProductRepositoryTurso implements IProductRepository {
    async create(data: CreateProductDto): Promise<Product> {
        const id = `PROD-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO products (id, name, description, sku, category, cost_price, retail_price, wholesale_price, unit, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            args: [
                id, data.name, data.description, data.sku, data.category,
                data.costPrice, data.retailPrice, data.wholesalePrice, data.unit,
                now, now
            ]
        });

        return {
            id,
            ...data,
            isActive: true,
            createdAt: new Date(now),
            updatedAt: new Date(now)
        };
    }

    async findById(id: string): Promise<Product | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM products WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToProduct(result.rows[0]);
    }

    async findBySku(sku: string): Promise<Product | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM products WHERE sku = ?',
            args: [sku]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToProduct(result.rows[0]);
    }

    async findAll(filters?: { category?: string; isActive?: boolean }): Promise<Product[]> {
        let sql = 'SELECT * FROM products WHERE 1=1';
        const args: any[] = [];

        if (filters?.category) {
            sql += ' AND category = ?';
            args.push(filters.category);
        }

        if (filters?.isActive !== undefined) {
            sql += ' AND is_active = ?';
            args.push(filters.isActive ? 1 : 0);
        }

        sql += ' ORDER BY name';

        const result = await tursoClient.execute({ sql, args });
        return result.rows.map(row => this.mapRowToProduct(row));
    }

    async update(id: string, data: UpdateProductDto): Promise<Product> {
        const updates: string[] = [];
        const args: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            args.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            args.push(data.description);
        }
        if (data.category !== undefined) {
            updates.push('category = ?');
            args.push(data.category);
        }
        if (data.costPrice !== undefined) {
            updates.push('cost_price = ?');
            args.push(data.costPrice);
        }
        if (data.retailPrice !== undefined) {
            updates.push('retail_price = ?');
            args.push(data.retailPrice);
        }
        if (data.wholesalePrice !== undefined) {
            updates.push('wholesale_price = ?');
            args.push(data.wholesalePrice);
        }
        if (data.unit !== undefined) {
            updates.push('unit = ?');
            args.push(data.unit);
        }
        if (data.isActive !== undefined) {
            updates.push('is_active = ?');
            args.push(data.isActive ? 1 : 0);
        }

        updates.push('updated_at = ?');
        args.push(new Date().toISOString());
        args.push(id);

        await tursoClient.execute({
            sql: `UPDATE products SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Producto no encontrado después de actualizar');
        return updated;
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM products WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToProduct(row: any): Product {
        return {
            id: row.id as string,
            name: row.name as string,
            description: row.description as string,
            sku: row.sku as string,
            category: row.category as string,
            costPrice: Number(row.cost_price),
            retailPrice: Number(row.retail_price),
            wholesalePrice: Number(row.wholesale_price),
            unit: row.unit as string,
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }
}
