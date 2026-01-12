/**
 * Sucursal de la empresa
 */
export interface Branch {
    id: string;
    name: string;
    code: string; // ej: "DIR", "JIN"
    address: string;
    phone: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateBranchDto = Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateBranchDto = Partial<CreateBranchDto>;
