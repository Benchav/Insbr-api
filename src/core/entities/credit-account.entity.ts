/**
 * Cuenta de crédito (CPP o CXC)
 */
export type CreditAccountType = 'CPP' | 'CXC'; // Cuentas por Pagar | Cuentas por Cobrar
export type CreditAccountStatus = 'PENDIENTE' | 'PAGADO_PARCIAL' | 'PAGADO';

export interface CreditAccount {
    id: string;
    type: CreditAccountType;

    // Relaciones
    branchId: string;
    supplierId?: string; // Para CPP
    supplierName?: string; // Nombre del proveedor (Join)
    customerId?: string; // Para CXC
    customerName?: string; // Nombre del cliente (Join)

    // Referencia a la transacción origen
    purchaseId?: string; // Si es CPP
    saleId?: string;     // Si es CXC

    // Montos en centavos
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;

    // Estado
    status: CreditAccountStatus;

    // Fechas
    dueDate: Date;
    createdAt: Date;
    updatedAt: Date;

    // Información adicional
    notes?: string;              // Notas adicionales
    invoiceNumber?: string;      // Número de factura del proveedor (CPP)
}

export interface CreditPayment {
    id: string;
    creditAccountId: string;
    amount: number; // En centavos
    paymentMethod: 'CASH' | 'TRANSFER' | 'CHECK';
    reference?: string;
    notes?: string;
    createdAt: Date;
}

export type CreateCreditAccountDto = Omit<CreditAccount, 'id' | 'paidAmount' | 'balanceAmount' | 'status' | 'createdAt' | 'updatedAt'>;
export type CreateCreditPaymentDto = Omit<CreditPayment, 'id' | 'createdAt'>;
