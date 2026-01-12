import { CashMovement, CreateCashMovementDto, CashMovementType } from '../entities/cash-movement.entity.js';

export interface ICashMovementRepository {
    create(data: CreateCashMovementDto): Promise<CashMovement>;
    findById(id: string): Promise<CashMovement | null>;
    findByBranch(branchId: string, filters?: {
        type?: CashMovementType;
        startDate?: Date;
        endDate?: Date;
    }): Promise<CashMovement[]>;
    getBalance(branchId: string): Promise<number>;
    delete(id: string): Promise<void>;
}
