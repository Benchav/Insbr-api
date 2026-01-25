import { tursoClient } from '../client.js';
import { IProductRepository } from '../../../core/interfaces/product.repository.js';
import { Product, CreateProductDto, UpdateProductDto } from '../../../core/entities/product.entity.js';

export class ProductRepositoryTurso implements IProductRepository {
    async create(data: CreateProductDto): Promise<Product> {
        const id = `PROD-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        // Si viene categoryId, usamos ese. Si viene solo category (texto legacy), buscamos si existe o lo dejamos null?
        // El script de migración ya llenó todo.
        // Asumimos que data.categoryId debe venir si se seleccionó una categoría.
        // Mantenemos data.category como texto de respaldo o nombre.

        await tursoClient.execute({
            sql: `INSERT INTO products (id, name, description, sku, category, category_id, cost_price, retail_price, wholesale_price, unit, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            args: [
                id, data.name, data.description, data.sku, data.category,
                data.categoryId || null, // Nuevo campo
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
            sql: `
                SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.id = ?
            `,
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToProduct(result.rows[0]);
    }

    async findBySku(sku: string): Promise<Product | null> {
        const result = await tursoClient.execute({
            sql: `
                SELECT p.*, c.name as category_name
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.sku = ?
            `,
            args: [sku]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToProduct(result.rows[0]);
    }

    async findAll(filters?: { category?: string; isActive?: boolean }): Promise<Product[]> {
        let sql = `
            SELECT p.*, c.name as category_name
            FROM products p
            LEFT JOIN categories c ON p.category_id = c.id
            WHERE 1=1
        `;
        const args: any[] = [];

        if (filters?.category) {
            // Filtramos por ID o por Nombre?
            // Si el filtro es un ID (comienza con CAT-), filtramos por ID.
            if (filters.category.startsWith('CAT-')) {
                sql += ' AND p.category_id = ?';
                args.push(filters.category);
            } else {
                sql += ' AND (p.category = ? OR c.name = ?)';
                args.push(filters.category, filters.category);
            }
        }

        if (filters?.isActive !== undefined) {
            sql += ' AND p.is_active = ?';
            args.push(filters.isActive ? 1 : 0);
        }

        sql += ' ORDER BY p.name';

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
        if (data.categoryId !== undefined) {
            updates.push('category_id = ?');
            args.push(data.categoryId || null);
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
            // Preferimos el nombre de la categoría JOIN, sino el campo legacy
            category: (row.category_name as string) || (row.category as string),
            categoryId: row.category_id as string | undefined,
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
