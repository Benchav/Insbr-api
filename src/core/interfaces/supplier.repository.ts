import { Supplier, CreateSupplierDto, UpdateSupplierDto } from '../entities/supplier.entity.js';

export interface ISupplierRepository {
    create(data: CreateSupplierDto): Promise<Supplier>;
    findById(id: string): Promise<Supplier | null>;
    findAll(filters?: { isActive?: boolean }): Promise<Supplier[]>;
    update(id: string, data: UpdateSupplierDto): Promise<Supplier>;
    delete(id: string): Promise<void>;
}
