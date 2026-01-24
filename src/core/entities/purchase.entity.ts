/**
 * Compra de insumos a proveedores
 */
export type PurchaseType = 'CASH' | 'CREDIT';

export interface PurchaseItem {
    productId: string;
    productName: string;
    quantity: number;
    unitCost: number; // En centavos
    subtotal: number; // En centavos
}

export interface Purchase {
    id: string;
    branchId: string;
    branchName?: string;
    supplierId: string;
    supplierName?: string;

    // Items comprados
    items: PurchaseItem[];

    // Totales en centavos
    subtotal: number;
    tax: number;
    discount: number;
    total: number;

    // Tipo de compra
    type: PurchaseType;

    // Información de pago
    paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK';

    // Metadata
    status: 'COMPLETED' | 'CANCELLED';
    invoiceNumber?: string;
    notes?: string;
    createdBy: string; // userId
    createdAt: Date;
}

export type CreatePurchaseDto = Omit<Purchase, 'id' | 'createdAt'>;
