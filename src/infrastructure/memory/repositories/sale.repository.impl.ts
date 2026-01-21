import { ISaleRepository } from '../../../core/interfaces/sale.repository.js';
import { Sale, CreateSaleDto } from '../../../core/entities/sale.entity.js';
import { storage } from '../storage.js';
import { randomUUID } from 'crypto';

export class SaleRepositoryImpl implements ISaleRepository {
    async create(data: CreateSaleDto): Promise<Sale> {
        const sale: Sale = {
            id: randomUUID(),
            ...data,
            createdAt: new Date()
        };

        storage.sales.set(sale.id, sale);
        return sale;
    }

    async findById(id: string): Promise<Sale | null> {
        return storage.sales.get(id) || null;
    }

    async findByBranch(
        branchId: string,
        filters?: { startDate?: Date; endDate?: Date; customerId?: string }
    ): Promise<Sale[]> {
        let sales = Array.from(storage.sales.values())
            .filter(s => s.branchId === branchId);

        if (filters?.startDate) {
            sales = sales.filter(s => s.createdAt >= filters.startDate!);
        }

        if (filters?.endDate) {
            sales = sales.filter(s => s.createdAt <= filters.endDate!);
        }

        if (filters?.customerId) {
            sales = sales.filter(s => s.customerId === filters.customerId);
        }

        return sales.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async findByCustomer(customerId: string): Promise<Sale[]> {
        return Array.from(storage.sales.values())
            .filter(s => s.customerId === customerId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async update(id: string, data: Partial<Sale>): Promise<Sale> {
        const sale = storage.sales.get(id);
        if (!sale) {
            throw new Error('Venta no encontrada');
        }

        const updated = { ...sale, ...data };
        storage.sales.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        storage.sales.delete(id);
    }
}
