import { Sale, CreateSaleDto } from '../entities/sale.entity.js';

export interface ISaleRepository {
    create(data: CreateSaleDto): Promise<Sale>;
    findById(id: string): Promise<Sale | null>;
    findByBranch(branchId: string, filters?: {
        startDate?: Date;
        endDate?: Date;
        customerId?: string;
    }): Promise<Sale[]>;
    findByCustomer(customerId: string): Promise<Sale[]>;
    update(id: string, data: Partial<Sale>): Promise<Sale>;
    delete(id: string): Promise<void>;
}
