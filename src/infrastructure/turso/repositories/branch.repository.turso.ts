import { tursoClient } from '../client.js';
import { IBranchRepository } from '../../../core/interfaces/branch.repository.js';
import { Branch, CreateBranchDto, UpdateBranchDto } from '../../../core/entities/branch.entity.js';

export class BranchRepositoryTurso implements IBranchRepository {
    async create(data: CreateBranchDto): Promise<Branch> {
        const id = `BRANCH-${data.code.toUpperCase()}-${Date.now()}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO branches (id, name, code, address, phone, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
            args: [id, data.name, data.code, data.address, data.phone, now, now]
        });

        return {
            id,
            ...data,
            isActive: true,
            createdAt: new Date(now),
            updatedAt: new Date(now)
        };
    }

    async findById(id: string): Promise<Branch | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM branches WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToBranch(result.rows[0]);
    }

    async findByCode(code: string): Promise<Branch | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM branches WHERE code = ?',
            args: [code]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToBranch(result.rows[0]);
    }

    async findAll(filters?: { isActive?: boolean }): Promise<Branch[]> {
        let sql = 'SELECT * FROM branches';
        const args: any[] = [];

        if (filters?.isActive !== undefined) {
            sql += ' WHERE is_active = ?';
            args.push(filters.isActive ? 1 : 0);
        }

        sql += ' ORDER BY name';

        const result = await tursoClient.execute({ sql, args });
        return result.rows.map(row => this.mapRowToBranch(row));
    }

    async update(id: string, data: UpdateBranchDto): Promise<Branch> {
        const updates: string[] = [];
        const args: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            args.push(data.name);
        }
        if (data.address !== undefined) {
            updates.push('address = ?');
            args.push(data.address);
        }
        if (data.phone !== undefined) {
            updates.push('phone = ?');
            args.push(data.phone);
        }
        if (data.isActive !== undefined) {
            updates.push('is_active = ?');
            args.push(data.isActive ? 1 : 0);
        }

        updates.push('updated_at = ?');
        args.push(new Date().toISOString());
        args.push(id);

        await tursoClient.execute({
            sql: `UPDATE branches SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Sucursal no encontrada después de actualizar');
        return updated;
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM branches WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToBranch(row: any): Branch {
        return {
            id: row.id as string,
            name: row.name as string,
            code: row.code as string,
            address: row.address as string,
            phone: row.phone as string,
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }
}
