import { ITransferRepository } from '../../../core/interfaces/transfer.repository.js';
import { Transfer, CreateTransferDto, TransferStatus, TransferType } from '../../../core/entities/transfer.entity.js';
import { storage } from '../storage.js';
import { randomUUID } from 'crypto';

export class TransferRepositoryImpl implements ITransferRepository {
    async create(data: CreateTransferDto): Promise<Transfer> {
        const transfer: Transfer = {
            id: randomUUID(),
            ...data,
            type: (data as any).type || 'SEND',
            status: (data as any).status || 'PENDING',
            createdAt: new Date()
        };

        storage.transfers.set(transfer.id, transfer);
        return transfer;
    }

    async findById(id: string): Promise<Transfer | null> {
        return storage.transfers.get(id) || null;
    }

    async findByBranch(
        branchId: string,
        filters?: { status?: TransferStatus; direction?: 'FROM' | 'TO' }
    ): Promise<Transfer[]> {
        let transfers = Array.from(storage.transfers.values());

        if (filters?.direction === 'FROM') {
            transfers = transfers.filter(t => t.fromBranchId === branchId);
        } else if (filters?.direction === 'TO') {
            transfers = transfers.filter(t => t.toBranchId === branchId);
        } else {
            transfers = transfers.filter(t =>
                t.fromBranchId === branchId || t.toBranchId === branchId
            );
        }

        if (filters?.status) {
            transfers = transfers.filter(t => t.status === filters.status);
        }

        return transfers.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async update(id: string, data: Partial<Transfer>): Promise<Transfer> {
        const transfer = await this.findById(id);
        if (!transfer) {
            throw new Error('Transferencia no encontrada');
        }

        const updated: Transfer = {
            ...transfer,
            ...data
        };

        storage.transfers.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        storage.transfers.delete(id);
    }
}
