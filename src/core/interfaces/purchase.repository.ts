import { Purchase, CreatePurchaseDto } from '../entities/purchase.entity.js';

export interface IPurchaseRepository {
    create(data: CreatePurchaseDto): Promise<Purchase>;
    findById(id: string): Promise<Purchase | null>;
    findByBranch(branchId: string, filters?: {
        startDate?: Date;
        endDate?: Date;
        supplierId?: string;
    }): Promise<Purchase[]>;
    findBySupplier(supplierId: string): Promise<Purchase[]>;
    update(id: string, data: Partial<Purchase>): Promise<Purchase>;
    delete(id: string): Promise<void>;
}
