import { IStockRepository } from '../../../core/interfaces/stock.repository.js';
import { Stock, CreateStockDto, UpdateStockDto } from '../../../core/entities/stock.entity.js';
import { storage } from '../storage.js';
import { randomUUID } from 'crypto';

export class StockRepositoryImpl implements IStockRepository {
    async create(data: CreateStockDto): Promise<Stock> {
        const stock: Stock = {
            id: randomUUID(),
            ...data,
            updatedAt: new Date()
        };

        storage.stock.set(stock.id, stock);
        return stock;
    }

    async findById(id: string): Promise<Stock | null> {
        return storage.stock.get(id) || null;
    }

    async findByProductAndBranch(productId: string, branchId: string): Promise<Stock | null> {
        for (const stock of storage.stock.values()) {
            if (stock.productId === productId && stock.branchId === branchId) {
                return stock;
            }
        }
        return null;
    }

    async findByBranch(branchId: string): Promise<Stock[]> {
        return Array.from(storage.stock.values()).filter(s => s.branchId === branchId);
    }

    async findByProduct(productId: string): Promise<Stock[]> {
        return Array.from(storage.stock.values()).filter(s => s.productId === productId);
    }

    async update(id: string, data: UpdateStockDto): Promise<Stock> {
        const stock = await this.findById(id);
        if (!stock) {
            throw new Error('Stock no encontrado');
        }

        const updated: Stock = {
            ...stock,
            ...data,
            updatedAt: new Date()
        };

        storage.stock.set(id, updated);
        return updated;
    }

    async updateQuantity(id: string, quantity: number): Promise<Stock> {
        return this.update(id, { quantity });
    }

    async delete(id: string): Promise<void> {
        storage.stock.delete(id);
    }
}
