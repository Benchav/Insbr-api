/**
 * Stock de productos por sucursal
 */
export interface Stock {
    id: string;
    productId: string;
    branchId: string;
    quantity: number;
    minStock: number; // Stock mínimo para alertas
    maxStock: number; // Stock máximo
    updatedAt: Date;
}

export type CreateStockDto = Omit<Stock, 'id' | 'updatedAt'>;
export type UpdateStockDto = Partial<Omit<CreateStockDto, 'productId' | 'branchId'>>;
