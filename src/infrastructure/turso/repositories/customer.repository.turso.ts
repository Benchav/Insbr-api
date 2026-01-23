import { tursoClient } from '../client.js';
import { ICustomerRepository } from '../../../core/interfaces/customer.repository.js';
import { Customer, CreateCustomerDto, UpdateCustomerDto } from '../../../core/entities/customer.entity.js';

export class CustomerRepositoryTurso implements ICustomerRepository {
    async create(data: CreateCustomerDto): Promise<Customer> {
        const id = `CUST-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO customers (id, name, contact_name, phone, email, address, tax_id, credit_limit, current_debt, credit_days, type, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 1, ?, ?)`,
            args: [
                id, data.name, data.contactName || null, data.phone, data.email || null,
                data.address, data.taxId || null, data.creditLimit, data.creditDays || 30, data.type,
                now, now
            ]
        });

        return {
            id,
            ...data,
            currentDebt: 0,
            isActive: true,
            createdAt: new Date(now),
            updatedAt: new Date(now)
        };
    }

    async findById(id: string): Promise<Customer | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM customers WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToCustomer(result.rows[0]);
    }

    async findAll(filters?: { type?: 'RETAIL' | 'WHOLESALE'; isActive?: boolean }): Promise<Customer[]> {
        let sql = 'SELECT * FROM customers WHERE 1=1';
        const args: any[] = [];

        if (filters?.type) {
            sql += ' AND type = ?';
            args.push(filters.type);
        }

        if (filters?.isActive !== undefined) {
            sql += ' AND is_active = ?';
            args.push(filters.isActive ? 1 : 0);
        }

        sql += ' ORDER BY name';

        const result = await tursoClient.execute({ sql, args });
        return result.rows.map(row => this.mapRowToCustomer(row));
    }

    async update(id: string, data: UpdateCustomerDto): Promise<Customer> {
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
        if (data.creditLimit !== undefined) {
            updates.push('credit_limit = ?');
            args.push(data.creditLimit);
        }
        if (data.creditDays !== undefined) {
            updates.push('credit_days = ?');
            args.push(data.creditDays);
        }
        if (data.type !== undefined) {
            updates.push('type = ?');
            args.push(data.type);
        }
        if (data.isActive !== undefined) {
            updates.push('is_active = ?');
            args.push(data.isActive ? 1 : 0);
        }

        updates.push('updated_at = ?');
        args.push(new Date().toISOString());
        args.push(id);

        await tursoClient.execute({
            sql: `UPDATE customers SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Cliente no encontrado después de actualizar');
        return updated;
    }

    async updateDebt(id: string, amount: number): Promise<Customer> {
        await tursoClient.execute({
            sql: 'UPDATE customers SET current_debt = ?, updated_at = ? WHERE id = ?',
            args: [amount, new Date().toISOString(), id]
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Cliente no encontrado después de actualizar deuda');
        return updated;
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM customers WHERE id = ?',
            args: [id]
        });
    }

    private mapRowToCustomer(row: any): Customer {
        return {
            id: row.id as string,
            name: row.name as string,
            contactName: row.contact_name as string | undefined,
            phone: row.phone as string,
            email: row.email as string | undefined,
            address: row.address as string,
            taxId: row.tax_id as string | undefined,
            creditLimit: Number(row.credit_limit),
            currentDebt: Number(row.current_debt),
            creditDays: Number(row.credit_days || 30),
            type: row.type as 'RETAIL' | 'WHOLESALE',
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }
}
