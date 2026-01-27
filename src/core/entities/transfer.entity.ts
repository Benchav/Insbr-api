/**
 * Transferencia de stock entre sucursales
 */
export type TransferStatus = 'REQUESTED' | 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
export type TransferType = 'SEND' | 'REQUEST';

export interface TransferItem {
    productId: string;
    productName: string;
    quantity: number;
}

export interface Transfer {
    id: string;

    // Sucursales
    fromBranchId: string;
    toBranchId: string;

    // Items transferidos
    items: TransferItem[];


    // Estado y tipo
    status: TransferStatus;
    type: TransferType;

    // Metadata
    notes?: string;
    createdBy: string; // userId
    approvedBy?: string; // userId que aprueba
    completedBy?: string; // userId que completa

    shippedBy?: string; // userId que despacha
    shippedAt?: Date;

    createdAt: Date;
    approvedAt?: Date;
    completedAt?: Date;
}

export type CreateTransferDto = Omit<Transfer, 'id' | 'status' | 'approvedBy' | 'completedBy' | 'createdAt' | 'approvedAt' | 'completedAt' | 'shippedBy' | 'shippedAt' | 'type'> & { type?: TransferType };
