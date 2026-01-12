/**
 * Cliente o sub-distribuidor
 */
export interface Customer {
    id: string;
    name: string;
    contactName?: string;
    phone: string;
    email?: string;
    address: string;
    taxId?: string; // RUC en Nicaragua

    // Línea de crédito
    creditLimit: number; // Límite de crédito en centavos
    currentDebt: number; // Deuda actual en centavos

    // Tipo de cliente
    type: 'RETAIL' | 'WHOLESALE'; // Detalle o mayorista

    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateCustomerDto = Omit<Customer, 'id' | 'currentDebt' | 'createdAt' | 'updatedAt'>;
export type UpdateCustomerDto = Partial<CreateCustomerDto>;
