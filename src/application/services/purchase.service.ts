import { IPurchaseRepository } from '../../core/interfaces/purchase.repository.js';
import { IStockRepository } from '../../core/interfaces/stock.repository.js';
import { ISupplierRepository } from '../../core/interfaces/supplier.repository.js';
import { ICreditAccountRepository } from '../../core/interfaces/credit-account.repository.js';
import { ICashMovementRepository } from '../../core/interfaces/cash-movement.repository.js';
import { CreatePurchaseDto, Purchase } from '../../core/entities/purchase.entity.js';
import { CreateCreditAccountDto } from '../../core/entities/credit-account.entity.js';
import { CreateCashMovementDto } from '../../core/entities/cash-movement.entity.js';
import { getNicaraguaNow, addDaysNicaragua } from '../../core/utils/date.utils.js';

export class PurchaseService {
    constructor(
        private purchaseRepository: IPurchaseRepository,
        private stockRepository: IStockRepository,
        private supplierRepository: ISupplierRepository,
        private creditAccountRepository: ICreditAccountRepository,
        private cashMovementRepository: ICashMovementRepository
    ) { }

    async createPurchase(data: CreatePurchaseDto): Promise<Purchase> {
        // 1. Validar que el proveedor exista
        const supplier = await this.supplierRepository.findById(data.supplierId);
        if (!supplier) {
            throw new Error('Proveedor no encontrado');
        }

        // 2. Crear la compra
        const purchase = await this.purchaseRepository.create(data);

        // 3. Actualizar stock (entrada de mercadería)
        for (const item of data.items) {
            const stock = await this.stockRepository.findByProductAndBranch(item.productId, data.branchId);

            if (stock) {
                // Actualizar stock existente
                await this.stockRepository.updateQuantity(stock.id, stock.quantity + item.quantity);
            } else {
                // Crear nuevo registro de stock
                await this.stockRepository.create({
                    productId: item.productId,
                    branchId: data.branchId,
                    quantity: item.quantity,
                    minStock: 10,
                    maxStock: 1000
                });
            }
        }

        // 4. Si es compra a crédito, crear cuenta por pagar (CPP)
        if (data.type === 'CREDIT') {
            // Usar zona horaria de Nicaragua para calcular fecha de vencimiento
            const dueDate = addDaysNicaragua(getNicaraguaNow(), supplier.creditDays);

            const creditAccountData: CreateCreditAccountDto = {
                type: 'CPP',
                branchId: data.branchId,
                supplierId: data.supplierId,
                purchaseId: purchase.id,
                totalAmount: data.total,
                dueDate,
                invoiceNumber: (data as any).invoiceNumber
            };

            await this.creditAccountRepository.create(creditAccountData);
        }

        // 5. Si es compra de contado, registrar movimiento de caja
        if (data.type === 'CASH') {
            const cashMovementData: CreateCashMovementDto = {
                branchId: data.branchId,
                type: 'EXPENSE',
                category: 'PURCHASE',
                amount: data.total,
                purchaseId: purchase.id,
                paymentMethod: data.paymentMethod || 'CASH',
                description: `Compra ${purchase.id} - ${supplier.name}`,
                createdBy: data.createdBy
            };

            await this.cashMovementRepository.create(cashMovementData);
        }

        return purchase;
    }

    async getPurchase(id: string): Promise<Purchase> {
        const purchase = await this.purchaseRepository.findById(id);
        if (!purchase) {
            throw new Error('Compra no encontrada');
        }
        return purchase;
    }

    async listPurchasesByBranch(
        branchId: string,
        filters?: { startDate?: Date; endDate?: Date; supplierId?: string }
    ): Promise<Purchase[]> {
        return this.purchaseRepository.findByBranch(branchId, filters);
    }

    /**
     * Actualiza información de una compra
     * Por seguridad, solo permite editar notas y número de factura
     * No permite modificar items ni montos para mantener integridad de datos
     */
    async updatePurchase(
        purchaseId: string,
        data: { notes?: string; invoiceNumber?: string }
    ): Promise<Purchase> {
        // Validar que la compra existe
        const purchase = await this.purchaseRepository.findById(purchaseId);
        if (!purchase) {
            throw new Error('Compra no encontrada');
        }

        // Validar que sea reciente (últimos 7 días) para mayor seguridad
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        if (purchase.createdAt < sevenDaysAgo) {
            throw new Error('Solo se pueden editar compras de los últimos 7 días');
        }

        // Actualizar solo campos permitidos
        return this.purchaseRepository.update(purchaseId, {
            notes: data.notes,
            invoiceNumber: data.invoiceNumber
        });
    }
}
