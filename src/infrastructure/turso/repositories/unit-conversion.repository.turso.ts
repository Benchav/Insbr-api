import { tursoClient } from '../client.js';
import { IUnitConversionRepository } from '../../../core/interfaces/unit-conversion.repository.js';
import { CreateUnitConversionDto, UnitConversion, UpdateUnitConversionDto } from '../../../core/entities/unit-conversion.entity.js';
import { randomUUID } from 'crypto';

export class UnitConversionRepositoryTurso implements IUnitConversionRepository {
    async create(data: CreateUnitConversionDto): Promise<UnitConversion> {
        const id = `UNIT-${randomUUID()}`;
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO unit_conversions (
                id, product_id, unit_name, unit_symbol, conversion_factor, unit_type,
                retail_price, wholesale_price, sales_type, is_active, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [
                id,
                data.productId,
                data.unitName,
                data.unitSymbol,
                data.conversionFactor,
                data.unitType,
                data.retailPrice ?? null,
                data.wholesalePrice ?? null,
                data.salesType,
                data.isActive ? 1 : 0,
                now
            ]
        });

        return {
            id,
            ...data,
            createdAt: new Date(now)
        };
    }

    async findById(id: string): Promise<UnitConversion | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM unit_conversions WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;
        return this.mapToEntity(result.rows[0]);
    }

    async findByProduct(productId: string): Promise<UnitConversion[]> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM unit_conversions WHERE product_id = ? AND is_active = 1 ORDER BY conversion_factor ASC',
            args: [productId]
        });

        return result.rows.map(row => this.mapToEntity(row));
    }

    async findByProductAndType(productId: string, unitType: 'BASE' | 'PURCHASE' | 'SALE'): Promise<UnitConversion[]> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM unit_conversions WHERE product_id = ? AND unit_type = ? AND is_active = 1',
            args: [productId, unitType]
        });

        return result.rows.map(row => this.mapToEntity(row));
    }

    async update(id: string, data: UpdateUnitConversionDto): Promise<UnitConversion> {
        const updates: string[] = [];
        const args: any[] = [];

        if (data.unitName !== undefined) {
            updates.push('unit_name = ?');
            args.push(data.unitName);
        }
        if (data.unitSymbol !== undefined) {
            updates.push('unit_symbol = ?');
            args.push(data.unitSymbol);
        }
        if (data.conversionFactor !== undefined) {
            updates.push('conversion_factor = ?');
            args.push(data.conversionFactor);
        }
        if (data.unitType !== undefined) {
            updates.push('unit_type = ?');
            args.push(data.unitType);
        }
        if (data.retailPrice !== undefined) {
            updates.push('retail_price = ?');
            args.push(data.retailPrice);
        }
        if (data.wholesalePrice !== undefined) {
            updates.push('wholesale_price = ?');
            args.push(data.wholesalePrice);
        }
        if (data.salesType !== undefined) {
            updates.push('sales_type = ?');
            args.push(data.salesType);
        }
        if (data.isActive !== undefined) {
            updates.push('is_active = ?');
            args.push(data.isActive ? 1 : 0);
        }

        if (updates.length === 0) {
            const existing = await this.findById(id);
            if (!existing) throw new Error('Unit conversion not found');
            return existing;
        }

        args.push(id);

        await tursoClient.execute({
            sql: `UPDATE unit_conversions SET ${updates.join(', ')} WHERE id = ?`,
            args
        });

        const updated = await this.findById(id);
        if (!updated) throw new Error('Unit conversion not found after update');
        return updated;
    }

    async delete(id: string): Promise<void> {
        await tursoClient.execute({
            sql: 'DELETE FROM unit_conversions WHERE id = ?',
            args: [id]
        });
    }

    async findByProductAndName(productId: string, unitName: string): Promise<UnitConversion[]> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM unit_conversions WHERE product_id = ? AND unit_name = ? AND is_active = 1',
            args: [productId, unitName]
        });

        return result.rows.map(row => this.mapToEntity(row));
    }

    async findDuplicates(productId: string, unitName: string, conversionFactor: number): Promise<UnitConversion[]> {
        const result = await tursoClient.execute({
            sql: `SELECT * FROM unit_conversions 
                  WHERE product_id = ? 
                  AND unit_name = ? 
                  AND conversion_factor = ? 
                  AND is_active = 1`,
            args: [productId, unitName, conversionFactor]
        });

        return result.rows.map(row => this.mapToEntity(row));
    }

    async findAll(): Promise<UnitConversion[]> {
        const result = await tursoClient.execute('SELECT * FROM unit_conversions WHERE is_active = 1');
        return result.rows.map(row => this.mapToEntity(row));
    }

    private mapToEntity(row: any): UnitConversion {
        return {
            id: row.id as string,
            productId: row.product_id as string,
            unitName: row.unit_name as string,
            unitSymbol: row.unit_symbol as string,
            conversionFactor: Number(row.conversion_factor),
            unitType: row.unit_type as 'BASE' | 'PURCHASE' | 'SALE',
            retailPrice: row.retail_price ? Number(row.retail_price) : undefined,
            wholesalePrice: row.wholesale_price ? Number(row.wholesale_price) : undefined,
            salesType: (row.sales_type as 'RETAIL' | 'WHOLESALE' | 'BOTH') || 'BOTH',
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at as string)
        };
    }
}
