import { Customer, CreateCustomerDto, UpdateCustomerDto } from '../entities/customer.entity.js';

export interface ICustomerRepository {
    create(data: CreateCustomerDto): Promise<Customer>;
    findById(id: string): Promise<Customer | null>;
    findAll(filters?: { isActive?: boolean; type?: 'RETAIL' | 'WHOLESALE' }): Promise<Customer[]>;
    update(id: string, data: UpdateCustomerDto): Promise<Customer>;
    updateDebt(id: string, amount: number): Promise<Customer>;
    delete(id: string): Promise<void>;
}
