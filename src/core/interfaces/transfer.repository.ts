import { Transfer, CreateTransferDto, TransferStatus } from '../entities/transfer.entity.js';

export interface ITransferRepository {
    create(data: CreateTransferDto): Promise<Transfer>;
    findById(id: string): Promise<Transfer | null>;
    findByBranch(branchId: string, filters?: {
        status?: TransferStatus;
        direction?: 'FROM' | 'TO';
    }): Promise<Transfer[]>;
    update(id: string, data: Partial<Transfer>): Promise<Transfer>;
    delete(id: string): Promise<void>;
}
