import { IPurchaseRepository } from '../../../core/interfaces/purchase.repository.js';
import { Purchase, CreatePurchaseDto } from '../../../core/entities/purchase.entity.js';
import { storage } from '../storage.js';
import { randomUUID } from 'crypto';

export class PurchaseRepositoryImpl implements IPurchaseRepository {
    async create(data: CreatePurchaseDto): Promise<Purchase> {
        const purchase: Purchase = {
            id: randomUUID(),
            ...data,
            createdAt: new Date()
        };

        storage.purchases.set(purchase.id, purchase);
        return purchase;
    }

    async findById(id: string): Promise<Purchase | null> {
        return storage.purchases.get(id) || null;
    }

    async findByBranch(
        branchId: string,
        filters?: { startDate?: Date; endDate?: Date; supplierId?: string }
    ): Promise<Purchase[]> {
        let purchases = Array.from(storage.purchases.values())
            .filter(p => p.branchId === branchId);

        if (filters?.startDate) {
            purchases = purchases.filter(p => p.createdAt >= filters.startDate!);
        }

        if (filters?.endDate) {
            purchases = purchases.filter(p => p.createdAt <= filters.endDate!);
        }

        if (filters?.supplierId) {
            purchases = purchases.filter(p => p.supplierId === filters.supplierId);
        }

        return purchases.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async findBySupplier(supplierId: string): Promise<Purchase[]> {
        return Array.from(storage.purchases.values())
            .filter(p => p.supplierId === supplierId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async update(id: string, data: Partial<Purchase>): Promise<Purchase> {
        const purchase = storage.purchases.get(id);
        if (!purchase) {
            throw new Error('Compra no encontrada');
        }

        const updated = { ...purchase, ...data };
        storage.purchases.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        storage.purchases.delete(id);
    }
}
