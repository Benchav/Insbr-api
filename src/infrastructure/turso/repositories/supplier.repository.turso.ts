import { tursoClient } from '../client.js';
import { ISupplierRepository } from '../../../core/interfaces/supplier.repository.js';
import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../../../core/entities/supplier.entity.js';

export class SupplierRepositoryTurso implements ISupplierRepository {
    async create(data: CreateSupplierDto): Promise<Supplier> {
        const id = `SUPP-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO suppliers (id, name, contact_name, phone, email, address, tax_id, credit_days, credit_limit, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
            args: [
                id, data.name, data.contactName, data.phone, data.email || null,
                data.address, data.taxId || null, data.creditDays, data.creditLimit,
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

    async findById(id: string): Promise<Supplier | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM suppliers WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToSupplier(result.rows[0]);
    }

    async findAll(filters?: { isActive?: boolean }): Promise<Supplier[]> {
        let sql = 'SELECT * FROM suppliers WHERE 1=1';
        const args: any[] = [];

        if (filters?.isActive !== undefined) {
            sql += ' AND is_active = ?';
            args.push(filters.isActive ? 1 : 0);
        }

        sql += ' ORDER BY name';

        const result = await tursoClient.execute({ sql, args });
        return result.rows.map(row => this.mapRowToSupplier(row));
    }

    async update(id: string, data: UpdateSupplierDto): Promise<Supplier> {
        const updates: string[] = [];
        const args: any[] = [];

        if (data.name !== undefined) {
            updates.push('name = ?');
            args.push(data.name);
        }
        if (data.contactName !== undefined) {
            updates.push('contact_name = ?');
            args.push(data.contactName);
        }
        if (data.phone !== undefined) {
            updates.push('phone = ?');
            args.push(data.phone);
        }
        if (data.email !== undefined) {
            updates.push('email = ?');
            args.push(data.email);
        }
        if (data.address !== undefined) {
            updates.push('address = ?');
            args.push(data.address);
        }
        if (data.taxId !== undefined) {
            updates.push('tax_id = ?');
            args.push(data.taxId);
        }
        if (data.creditDays !== undefined) {
            updates.push('credit_days = ?');
            args.push(data.creditDays);
        }
        if (data.creditLimit !== undefined) {
            updates.push('credit_limit = ?');
            args.push(data.creditLimit);
        }
        if (data.isActive !== undefined) {
            updates.push('is_active = ?');
            args.push(data.isActive ? 1 : 0);
        }

        updates.push('updated_at = ?');
        args.push(new Date().toISOString());
        args.push(id);

        await tursoClient.execute({
            sql: `UPDATE suppliers SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Proveedor no encontrado después de actualizar');
        return updated;
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM suppliers WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToSupplier(row: any): Supplier {
        return {
            id: row.id as string,
            name: row.name as string,
            contactName: row.contact_name as string,
            phone: row.phone as string,
            email: row.email as string | undefined,
            address: row.address as string,
            taxId: row.tax_id as string | undefined,
            creditDays: Number(row.credit_days),
            creditLimit: Number(row.credit_limit),
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }
}
