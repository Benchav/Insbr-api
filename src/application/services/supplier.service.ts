import { ISupplierRepository } from '../../core/interfaces/supplier.repository.js';
import { Supplier } from '../../core/entities/supplier.entity.js';

export class SupplierService {
    constructor(private supplierRepository: ISupplierRepository) { }

    async createSupplier(data: {
        name: string;
        contactName: string;
        phone: string;
        email?: string;
        address: string;
        taxId?: string;
        creditDays: number;
        creditLimit: number;
    }): Promise<Supplier> {
        return this.supplierRepository.create({
            ...data,
            isActive: true
        });
    }

    async getSupplier(id: string): Promise<Supplier> {
        const supplier = await this.supplierRepository.findById(id);
        if (!supplier) {
            throw new Error('Proveedor no encontrado');
        }
        return supplier;
    }

    async listSuppliers(filters?: { isActive?: boolean }): Promise<Supplier[]> {
        return this.supplierRepository.findAll(filters);
    }

    async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
        const supplier = await this.supplierRepository.findById(id);
        if (!supplier) {
            throw new Error('Proveedor no encontrado');
        }
        return this.supplierRepository.update(id, data);
    }

    async deleteSupplier(id: string): Promise<void> {
        const supplier = await this.supplierRepository.findById(id);
        if (!supplier) {
            throw new Error('Proveedor no encontrado');
        }
        await this.supplierRepository.delete(id);
    }
}
