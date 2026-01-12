/**
 * Transferencia de stock entre sucursales
 */
export type TransferStatus = 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';

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

    // Estado
    status: TransferStatus;

    // Metadata
    notes?: string;
    createdBy: string; // userId
    approvedBy?: string; // userId que aprueba
    completedBy?: string; // userId que completa

    createdAt: Date;
    approvedAt?: Date;
    completedAt?: Date;
}

export type CreateTransferDto = Omit<Transfer, 'id' | 'status' | 'approvedBy' | 'completedBy' | 'createdAt' | 'approvedAt' | 'completedAt'>;
