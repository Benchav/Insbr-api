import { ISaleRepository } from '../../core/interfaces/sale.repository.js';
import { IStockRepository } from '../../core/interfaces/stock.repository.js';
import { ICustomerRepository } from '../../core/interfaces/customer.repository.js';
import { ICreditAccountRepository } from '../../core/interfaces/credit-account.repository.js';
import { ICashMovementRepository } from '../../core/interfaces/cash-movement.repository.js';
import { IProductRepository } from '../../core/interfaces/product.repository.js';
import { CreateSaleDto, Sale, SaleItem } from '../../core/entities/sale.entity.js';
import { CreateCreditAccountDto } from '../../core/entities/credit-account.entity.js';
import { CreateCashMovementDto } from '../../core/entities/cash-movement.entity.js';
import { getNicaraguaNow, addDaysNicaragua, isTodayNicaragua } from '../../core/utils/date.utils.js';

export class SaleService {
    constructor(
        private saleRepository: ISaleRepository,
        private stockRepository: IStockRepository,
        private customerRepository: ICustomerRepository,
        private creditAccountRepository: ICreditAccountRepository,
        private cashMovementRepository: ICashMovementRepository,
        private productRepository: IProductRepository
    ) { }

    async createSale(data: CreateSaleDto): Promise<Sale> {
        // 1. Validar stock disponible para cada item
        for (const item of data.items) {
            const stock = await this.stockRepository.findByProductAndBranch(item.productId, data.branchId);

            if (!stock || stock.quantity < item.quantity) {
                const product = await this.productRepository.findById(item.productId);
                throw new Error(
                    `Stock insuficiente para ${product?.name || item.productId}. ` +
                    `Disponible: ${stock?.quantity || 0}, Requerido: ${item.quantity}`
                );
            }
        }

        // 2. Si es venta a crédito, validar límite de crédito del cliente
        if (data.type === 'CREDIT') {
            if (!data.customerId) {
                throw new Error('Se requiere un cliente para ventas a crédito');
            }

            const customer = await this.customerRepository.findById(data.customerId);
            if (!customer) {
                throw new Error('Cliente no encontrado');
            }

            const availableCredit = customer.creditLimit - customer.currentDebt;
            if (data.total > availableCredit) {
                throw new Error(
                    `Límite de crédito excedido. Disponible: C$ ${(availableCredit / 100).toFixed(2)}, ` +
                    `Requerido: C$ ${(data.total / 100).toFixed(2)}`
                );
            }
        }

        // 3. Crear la venta
        const sale = await this.saleRepository.create(data);

        // 4. Actualizar stock
        for (const item of data.items) {
            const stock = await this.stockRepository.findByProductAndBranch(item.productId, data.branchId);
            if (stock) {
                await this.stockRepository.updateQuantity(stock.id, stock.quantity - item.quantity);
            }
        }

        // 5. Si es venta a crédito, crear cuenta por cobrar (CXC)
        if (data.type === 'CREDIT' && data.customerId) {
            // Usar zona horaria de Nicaragua para calcular fecha de vencimiento
            const dueDate = addDaysNicaragua(getNicaraguaNow(), 30); // 30 días por defecto

            const creditAccountData: CreateCreditAccountDto = {
                type: 'CXC',
                branchId: data.branchId,
                customerId: data.customerId,
                saleId: sale.id,
                totalAmount: data.total,
                dueDate,
                deliveryDate: (data as any).deliveryDate ? new Date((data as any).deliveryDate) : undefined,
                notes: (data as any).notes
            };

            await this.creditAccountRepository.create(creditAccountData);

            // Actualizar deuda del cliente
            await this.customerRepository.updateDebt(data.customerId, data.total);
        }

        // 6. Si es venta de contado, registrar movimiento de caja
        if (data.type === 'CASH') {
            const cashMovementData: CreateCashMovementDto = {
                branchId: data.branchId,
                type: 'INCOME',
                category: 'SALE',
                amount: data.total,
                saleId: sale.id,
                paymentMethod: data.paymentMethod || 'CASH',
                description: `Venta ${sale.id}`,
                createdBy: data.createdBy
            };

            await this.cashMovementRepository.create(cashMovementData);
        }

        return sale;
    }

    async getSale(id: string): Promise<Sale> {
        const sale = await this.saleRepository.findById(id);
        if (!sale) {
            throw new Error('Venta no encontrada');
        }
        return sale;
    }

    async listSalesByBranch(
        branchId: string,
        filters?: { startDate?: Date; endDate?: Date; customerId?: string }
    ): Promise<Sale[]> {
        return this.saleRepository.findByBranch(branchId, filters);
    }

    /**
     * Cancela una venta y revierte todas las operaciones asociadas
     * - Devuelve productos al inventario
     * - Revierte movimiento de caja (si es contado)
     * - Cancela cuenta por cobrar (si es crédito)
     * - Actualiza deuda del cliente (si es crédito)
     */
    async cancelSale(saleId: string, userId: string): Promise<Sale> {
        // 1. Obtener la venta
        const sale = await this.saleRepository.findById(saleId);
        if (!sale) {
            throw new Error('Venta no encontrada');
        }

        // 2. Validar que la venta no esté ya cancelada
        if (sale.status === 'CANCELLED') {
            throw new Error('Esta venta ya está cancelada');
        }

        // 3. Validar que sea del día actual (solo se pueden cancelar ventas del día)
        // Usar zona horaria de Nicaragua para validación consistente
        if (!isTodayNicaragua(sale.createdAt)) {
            throw new Error('Solo se pueden cancelar ventas del día actual (hora de Nicaragua)');
        }



        // 4. Revertir stock - devolver productos al inventario
        for (const item of sale.items) {
            const stock = await this.stockRepository.findByProductAndBranch(
                item.productId,
                sale.branchId
            );

            if (stock) {
                await this.stockRepository.updateQuantity(
                    stock.id,
                    stock.quantity + item.quantity
                );
            } else {
                // Si no existe el stock, crearlo
                await this.stockRepository.create({
                    productId: item.productId,
                    branchId: sale.branchId,
                    quantity: item.quantity,
                    minStock: 10,
                    maxStock: 1000
                });
            }
        }

        // 5. Si es venta de contado, revertir movimiento de caja
        if (sale.type === 'CASH') {
            // Crear movimiento de egreso para revertir el ingreso
            const reversalMovement: CreateCashMovementDto = {
                branchId: sale.branchId,
                type: 'EXPENSE',
                category: 'ADJUSTMENT', // Ajuste por cancelación de venta
                amount: sale.total,
                saleId: sale.id,
                paymentMethod: sale.paymentMethod || 'CASH',
                description: `Cancelación de venta ${sale.id}`,
                createdBy: userId
            };

            await this.cashMovementRepository.create(reversalMovement);
        }

        // 6. Si es venta a crédito, cancelar cuenta por cobrar
        if (sale.type === 'CREDIT' && sale.customerId) {
            // Buscar la cuenta por cobrar asociada
            const creditAccounts = await this.creditAccountRepository.findByBranch(
                sale.branchId,
                { type: 'CXC' }
            );

            const creditAccount = creditAccounts.find(ca => ca.saleId === sale.id);

            if (creditAccount) {
                // Validar que no tenga pagos
                if (creditAccount.paidAmount > 0) {
                    throw new Error(
                        'No se puede cancelar una venta a crédito que ya tiene pagos registrados. ' +
                        `Monto pagado: C$${(creditAccount.paidAmount / 100).toFixed(2)}`
                    );
                }

                // Eliminar la cuenta por cobrar
                await this.creditAccountRepository.delete(creditAccount.id);

                // Revertir deuda del cliente
                await this.customerRepository.updateDebt(sale.customerId, -sale.total);
            }
        }

        // 7. Actualizar estado de la venta a CANCELLED
        const updatedSale = await this.saleRepository.update(sale.id, {
            status: 'CANCELLED'
        });

        return updatedSale;
    }
}
