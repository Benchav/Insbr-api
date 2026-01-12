import { ISupplierRepository } from '../../../core/interfaces/supplier.repository.js';
import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../../../core/entities/supplier.entity.js';
import { storage } from '../storage.js';
import { randomUUID } from 'crypto';

export class SupplierRepositoryImpl implements ISupplierRepository {
    async create(data: CreateSupplierDto): Promise<Supplier> {
        const supplier: Supplier = {
            id: randomUUID(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        storage.suppliers.set(supplier.id, supplier);
        return supplier;
    }

    async findById(id: string): Promise<Supplier | null> {
        return storage.suppliers.get(id) || null;
    }

    async findAll(filters?: { isActive?: boolean }): Promise<Supplier[]> {
        let suppliers = Array.from(storage.suppliers.values());

        if (filters?.isActive !== undefined) {
            suppliers = suppliers.filter(s => s.isActive === filters.isActive);
        }

        return suppliers;
    }

    async update(id: string, data: UpdateSupplierDto): Promise<Supplier> {
        const supplier = await this.findById(id);
        if (!supplier) {
            throw new Error('Proveedor no encontrado');
        }

        const updated: Supplier = {
            ...supplier,
            ...data,
            updatedAt: new Date()
        };

        storage.suppliers.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        storage.suppliers.delete(id);
    }
}
