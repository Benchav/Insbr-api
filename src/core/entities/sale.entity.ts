/**
 * Venta de productos
 */
export type SaleType = 'CASH' | 'CREDIT';

export interface SaleItem {
    productId: string;
    productName: string;
    quantity: number;           // Cantidad en la unidad seleccionada

    // Conversión de unidades (opcional)
    unitId?: string;            // ID de la unidad usada
    unitName?: string;          // Nombre de la unidad (ej: "Quintal")
    unitSymbol?: string;        // Símbolo (ej: "qq")
    baseQuantity?: number;      // Cantidad convertida a unidad base

    unitPrice: number;          // Precio por unidad seleccionada (en centavos)
    subtotal: number;           // En centavos
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
