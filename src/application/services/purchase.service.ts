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

        // 1.1 Generar número de factura si no existe
        if (!data.invoiceNumber || data.invoiceNumber.trim() === '') {
            // Formato: INV-{YYYYMMDD}-{RANDOM}
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase();
            data.invoiceNumber = `INV-${dateStr}-${randomStr}`;
        }

        // 1.2 Recalcular totales para asegurar integridad
        let calculatedSubtotal = 0;
        const validatedItems = data.items.map(item => {
            // Asegurar que subtotal del item sea correcto (cantidad * costo unitario)
            const itemSubtotal = item.quantity * item.unitCost;
            calculatedSubtotal += itemSubtotal;
            return {
                ...item,
                subtotal: itemSubtotal
            };
        });

        // Reemplazar items con los validados
        data.items = validatedItems;
        data.subtotal = calculatedSubtotal;

        // Calcular total final (Subtotal + Impuestos - Descuentos)
        // Nota: Asumimos que tax y discount vienen validados o son 0 si no se envían
        const tax = data.tax || 0;
        const discount = data.discount || 0;
        data.total = data.subtotal + tax - discount;

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
                totalAmount: data.total, // Usar el total recalculado
                dueDate,
                invoiceNumber: data.invoiceNumber // Usar el número de factura (generado o proporcionado)
            };

            await this.creditAccountRepository.create(creditAccountData);
        }

        // 5. Si es compra de contado, registrar movimiento de caja
        if (data.type === 'CASH') {
            const cashMovementData: CreateCashMovementDto = {
                branchId: data.branchId,
                type: 'EXPENSE',
                category: 'PURCHASE',
                amount: data.total, // Usar el total recalculado
                purchaseId: purchase.id,
                paymentMethod: data.paymentMethod || 'CASH',
                description: `Compra ${data.invoiceNumber} - ${supplier.name}`,
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

    /**
     * Cancela una compra y revierte todas las operaciones asociadas
     * - Resta productos del inventario (Salida)
     * - Revertir movimiento de caja (si es contado)
     * - Cancelar cuenta por pagar (si es crédito)
     */
    async cancelPurchase(purchaseId: string, userId: string): Promise<Purchase> {
        // 1. Obtener la compra
        const purchase = await this.purchaseRepository.findById(purchaseId);
        if (!purchase) {
            throw new Error('Compra no encontrada');
        }

        // 2. Validar que no esté ya cancelada
        if (purchase.status === 'CANCELLED') {
            throw new Error('Esta compra ya está cancelada');
        }

        // 3. Revertir stock (Salida de mercadería)
        for (const item of purchase.items) {
            const stock = await this.stockRepository.findByProductAndBranch(
                item.productId,
                purchase.branchId
            );

            if (stock) {
                // Verificar si hay suficiente stock para revertir (opcional, pero recomendado evitar negativos)
                // Si permitimos negativos para corrección, solo restamos.
                await this.stockRepository.updateQuantity(
                    stock.id,
                    stock.quantity - item.quantity // Restar lo que se había sumado
                );
            }
            // Si no hay stock record, es raro porque la compra lo creó, pero si se borró manualmente, no hacemos nada o lanzamos error.
        }

        // 4. Revertir transacciones financieras

        // 4.1 Si fue Crédito (CPP)
        if (purchase.type === 'CREDIT') {
            // Buscar la cuenta por pagar asociada
            // Nota: Asumimos que podemos buscar por purchaseId en CreditAccountRepository
            // Si no existe método directo, filtramos.
            const creditAccounts = await this.creditAccountRepository.findByBranch(purchase.branchId);
            const cpp = creditAccounts.find(c => c.purchaseId === purchase.id && c.type === 'CPP');

            if (cpp) {
                // Verificar pagos realizados
                if (cpp.paidAmount > 0) {
                    throw new Error(`No se puede cancelar compra con pagos realizados. Monto pagado: ${cpp.paidAmount}`);
                }
                // Eliminar la CPP
                await this.creditAccountRepository.delete(cpp.id);
            }
        }

        // 4.2 Si fue Contado (Cash)
        if (purchase.type === 'CASH') {
            // Crear movimiento de ingreso (Contra-partida) para anular el gasto
            // Opcional: Podríamos borrar el gasto original si queremos "desaparecerlo", pero contablemente es mejor dejar rastro y anular.
            // Para simplificar y limpiar, borraremos el movimiento original si es posible, O creamos un INCOME de ajuste.
            // El usuario pidió "eliminarce" (implica desaparecer o anular). "Cancelación" es más seguro.
            // Vamos a crear un INCOME de tipo 'ADJUSTMENT' para devolver el dinero a caja.

            const reversalMovement: CreateCashMovementDto = {
                branchId: purchase.branchId,
                type: 'INCOME',
                category: 'ADJUSTMENT',
                amount: purchase.total,
                purchaseId: purchase.id,
                paymentMethod: purchase.paymentMethod || 'CASH',
                description: `Cancelación Compra ${purchase.invoiceNumber || purchase.id}`,
                createdBy: userId
            };

            await this.cashMovementRepository.create(reversalMovement);
        }

        // 5. Actualizar estado de la compra
        const updatedPurchase = await this.purchaseRepository.update(purchase.id, {
            status: 'CANCELLED'
        });

        return updatedPurchase;
    }
}
