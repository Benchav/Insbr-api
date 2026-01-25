import { Stock, CreateStockDto, UpdateStockDto } from '../entities/stock.entity.js';

export interface IStockRepository {
    create(data: CreateStockDto): Promise<Stock>;
    findById(id: string): Promise<Stock | null>;
    findByProductAndBranch(productId: string, branchId: string): Promise<Stock | null>;
    findByBranch(branchId: string, categoryId?: string): Promise<Stock[]>;
    findByProduct(productId: string): Promise<Stock[]>;
    update(id: string, data: UpdateStockDto): Promise<Stock>;
    updateQuantity(id: string, quantity: number): Promise<Stock>;
    delete(id: string): Promise<void>;
}
