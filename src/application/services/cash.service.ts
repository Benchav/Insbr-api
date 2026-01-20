import { ICashMovementRepository } from '../../core/interfaces/cash-movement.repository.js';
import { CashMovement, CreateCashMovementDto } from '../../core/entities/cash-movement.entity.js';

export interface DailyBalance {
    date: Date;
    income: number;
    expenses: number;
    netBalance: number;
    movements: CashMovement[];
}

/**
 * Servicio para gestión de caja y flujo de efectivo
 */
export class CashService {
    constructor(
        private cashMovementRepository: ICashMovementRepository
    ) { }

    /**
     * Obtiene el balance de caja del día para una sucursal
     */
    async getDailyBalance(branchId: string, date: Date = new Date()): Promise<DailyBalance> {
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const movements = await this.cashMovementRepository.findByBranch(branchId, {
            startDate: startOfDay,
            endDate: endOfDay
        });

        let income = 0;
        let expenses = 0;

        movements.forEach(movement => {
            if (movement.type === 'INCOME') {
                income += movement.amount;
            } else {
                expenses += movement.amount;
            }
        });

        return {
            date,
            income,
            expenses,
            netBalance: income - expenses,
            movements
        };
    }

    /**
     * Obtiene el total de ingresos del día
     */
    async getDailyIncome(branchId: string, date: Date = new Date()): Promise<number> {
        const balance = await this.getDailyBalance(branchId, date);
        return balance.income;
    }

    /**
     * Obtiene el total de egresos del día
     */
    async getDailyExpenses(branchId: string, date: Date = new Date()): Promise<number> {
        const balance = await this.getDailyBalance(branchId, date);
        return balance.expenses;
    }

    /**
     * Registra un movimiento de caja manual (gasto, ajuste, etc.)
     */
    async registerManualMovement(data: CreateCashMovementDto): Promise<CashMovement> {
        // Validar que el monto sea positivo
        if (data.amount <= 0) {
            throw new Error('El monto debe ser mayor a cero');
        }

        // Validar que tenga descripción
        if (!data.description || data.description.trim() === '') {
            throw new Error('La descripción es requerida');
        }

        return this.cashMovementRepository.create(data);
    }

    /**
     * Obtiene el flujo de caja en un rango de fechas
     */
    async getCashFlow(
        branchId: string,
        startDate: Date,
        endDate: Date
    ): Promise<CashMovement[]> {
        return this.cashMovementRepository.findByBranch(branchId, {
            startDate,
            endDate
        });
    }

    /**
     * Obtiene resumen de caja por categoría
     */
    async getCashSummaryByCategory(
        branchId: string,
        startDate: Date,
        endDate: Date
    ): Promise<Map<string, { income: number; expense: number }>> {
        const movements = await this.getCashFlow(branchId, startDate, endDate);
        const summary = new Map<string, { income: number; expense: number }>();

        movements.forEach(movement => {
            const current = summary.get(movement.category) || { income: 0, expense: 0 };

            if (movement.type === 'INCOME') {
                current.income += movement.amount;
            } else {
                current.expense += movement.amount;
            }

            summary.set(movement.category, current);
        });

        return summary;
    }
}
