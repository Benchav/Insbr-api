/**
 * Venta de productos
 */
export type SaleType = 'CASH' | 'CREDIT';

export interface SaleItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number; // En centavos
    subtotal: number;  // En centavos
}

export interface Sale {
    id: string;
    branchId: string;
    customerId?: string;

    // Items vendidos
    items: SaleItem[];

    // Totales en centavos
    subtotal: number;
    tax: number;
    discount: number;
    total: number;

    // Tipo de venta
    type: SaleType;

    // Información de pago
    paymentMethod?: 'CASH' | 'TRANSFER' | 'CHECK';

    // Estado de la venta
    status?: 'ACTIVE' | 'CANCELLED';

    // Metadata
    notes?: string;
    createdBy: string; // userId
    createdAt: Date;
}

export type CreateSaleDto = Omit<Sale, 'id' | 'createdAt'>;
