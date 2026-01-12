import { ICashMovementRepository } from '../../../core/interfaces/cash-movement.repository.js';
import { CashMovement, CreateCashMovementDto, CashMovementType } from '../../../core/entities/cash-movement.entity.js';
import { storage } from '../storage.js';
import { randomUUID } from 'crypto';

export class CashMovementRepositoryImpl implements ICashMovementRepository {
    async create(data: CreateCashMovementDto): Promise<CashMovement> {
        const movement: CashMovement = {
            id: randomUUID(),
            ...data,
            createdAt: new Date()
        };

        storage.cashMovements.set(movement.id, movement);
        return movement;
    }

    async findById(id: string): Promise<CashMovement | null> {
        return storage.cashMovements.get(id) || null;
    }

    async findByBranch(
        branchId: string,
        filters?: { type?: CashMovementType; startDate?: Date; endDate?: Date }
    ): Promise<CashMovement[]> {
        let movements = Array.from(storage.cashMovements.values())
            .filter(m => m.branchId === branchId);

        if (filters?.type) {
            movements = movements.filter(m => m.type === filters.type);
        }

        if (filters?.startDate) {
            movements = movements.filter(m => m.createdAt >= filters.startDate!);
        }

        if (filters?.endDate) {
            movements = movements.filter(m => m.createdAt <= filters.endDate!);
        }

        return movements.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    async getBalance(branchId: string): Promise<number> {
        const movements = await this.findByBranch(branchId);

        return movements.reduce((balance, movement) => {
            if (movement.type === 'INCOME') {
                return balance + movement.amount;
            } else {
                return balance - movement.amount;
            }
        }, 0);
    }

    async delete(id: string): Promise<void> {
        storage.cashMovements.delete(id);
    }
}
