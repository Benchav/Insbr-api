import { tursoClient } from '../client.js';
import { ICategoryRepository } from '../../../core/interfaces/category.repository.js';
import { Category, CreateCategoryDto, UpdateCategoryDto } from '../../../core/entities/category.entity.js';

export class CategoryRepositoryTurso implements ICategoryRepository {

    async create(data: CreateCategoryDto): Promise<Category> {
        const id = `CAT-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO categories (id, name, description, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                data.name,
                data.description || null,
                data.isActive ? 1 : 0,
                now,
                now
            ]
        });

        return {
            id,
            ...data,
            description: data.description || undefined,
            createdAt: new Date(now),
            updatedAt: new Date(now)
        };
    }

    async findAll(includeInactive: boolean = false): Promise<Category[]> {
        let sql = 'SELECT * FROM categories';
        const args: any[] = [];

        if (!includeInactive) {
            sql += ' WHERE is_active = 1';
        }

        sql += ' ORDER BY name ASC';

        const result = await tursoClient.execute({ sql, args });
        return result.rows.map(row => this.mapRowToCategory(row));
    }

    async findById(id: string): Promise<Category | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM categories WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;
        return this.mapRowToCategory(result.rows[0]);
    }

    async findByName(name: string): Promise<Category | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM categories WHERE name = ?',
            args: [name]
        });

        if (result.rows.length === 0) return null;
        return this.mapRowToCategory(result.rows[0]);
    }

    async update(id: string, data: UpdateCategoryDto): Promise<Category> {
        const updates: string[] = [];
        const args: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            args.push(data.name);
        }
        if (data.description !== undefined) {
            updates.push('description = ?');
            args.push(data.description || null);
        }
        if (data.isActive !== undefined) {
            updates.push('is_active = ?');
            args.push(data.isActive ? 1 : 0);
        }

        updates.push('updated_at = ?');
        args.push(new Date().toISOString());

        args.push(id);

        if (updates.length > 0) {
            await tursoClient.execute({
                sql: `UPDATE categories SET ${updates.join(', ')} WHERE id = ?`,
                args
            });
        }

        const updated = await this.findById(id);
        if (!updated) throw new Error('Category not found after update');
        return updated;
    }

    async delete(id: string): Promise<void> {
        // En lugar de borrar físicamente, verificamos si está en uso. 
        // Si no está en uso, se puede borrar. Si está en uso, mejor descactivar.
        // Por simplicidad del requerimiento "eliminar", intentamos borrar.
        // SQLite lanzará error si hay FK constraint (cuando agreguemos la FK en productos).
        // Por ahora, borrado lógico o físico? El usuario pidió "eliminar", pero por seguridad haremos soft delete si falla el hard delete?
        // Vamos con Hard Delete, asumiendo que el usuario sabe lo que hace, o el FK prevendrá huérfanos.

        await tursoClient.execute({
            sql: 'DELETE FROM categories WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToCategory(row: any): Category {
        return {
            id: row.id as string,
            name: row.name as string,
            description: row.description as string | undefined,
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }
}
