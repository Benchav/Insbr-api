/**
 * Compra de insumos a proveedores
 */
export type PurchaseType = 'CASH' | 'CREDIT';

export interface PurchaseItem {
    productId: string;
    productName: string;
    quantity: number;           // Cantidad en la unidad de compra

    // Conversión de unidades (opcional)
    unitId?: string;            // ID de la unidad usada
    unitName?: string;          // Nombre de la unidad (ej: "Quintal")
    unitSymbol?: string;        // Símbolo (ej: "qq")
    baseQuantity?: number;      // Cantidad convertida a unidad base

    unitCost: number;           // Costo por unidad de compra (en centavos)
    subtotal: number;           // En centavos
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

export type CreatePurchaseDto = Omit<Purchase, 'id' | 'createdAt'> & { dueDate?: Date };
