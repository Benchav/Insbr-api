/**
 * Proveedor mayorista de insumos
 */
export interface Supplier {
    id: string;
    name: string;
    contactName: string;
    phone: string;
    email?: string;
    address: string;
    taxId?: string; // RUC en Nicaragua

    // Términos de crédito
    creditDays: number; // Días de crédito otorgados
    creditLimit: number; // Límite de crédito en centavos

    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateSupplierDto = Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateSupplierDto = Partial<CreateSupplierDto>;
