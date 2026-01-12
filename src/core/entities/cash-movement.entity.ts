/**
 * Movimiento de caja por sucursal
 */
export type CashMovementType = 'INCOME' | 'EXPENSE';
export type CashMovementCategory =
    | 'SALE'           // Venta
    | 'PURCHASE'       // Compra
    | 'CREDIT_PAYMENT' // Abono a crédito
    | 'EXPENSE'        // Gasto operativo
    | 'TRANSFER'       // Transferencia entre cajas
    | 'ADJUSTMENT';    // Ajuste

export interface CashMovement {
    id: string;
    branchId: string;

    // Tipo y categoría
    type: CashMovementType;
    category: CashMovementCategory;

    // Monto en centavos
    amount: number;

    // Referencias
    saleId?: string;
    purchaseId?: string;
    creditAccountId?: string;

    // Método de pago
    paymentMethod: 'CASH' | 'TRANSFER' | 'CHECK';
    reference?: string;

    // Metadata
    description: string;
    notes?: string;
    createdBy: string; // userId
    createdAt: Date;
}

export type CreateCashMovementDto = Omit<CashMovement, 'id' | 'createdAt'>;
