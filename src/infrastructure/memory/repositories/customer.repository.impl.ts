import { ICustomerRepository } from '../../../core/interfaces/customer.repository.js';
import { Customer, CreateCustomerDto, UpdateCustomerDto } from '../../../core/entities/customer.entity.js';
import { storage } from '../storage.js';
import { randomUUID } from 'crypto';

export class CustomerRepositoryImpl implements ICustomerRepository {
    async create(data: CreateCustomerDto): Promise<Customer> {
        const customer: Customer = {
            id: randomUUID(),
            ...data,
            currentDebt: 0,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        storage.customers.set(customer.id, customer);
        return customer;
    }

    async findById(id: string): Promise<Customer | null> {
        return storage.customers.get(id) || null;
    }

    async findAll(filters?: { isActive?: boolean; type?: 'RETAIL' | 'WHOLESALE' }): Promise<Customer[]> {
        let customers = Array.from(storage.customers.values());

        if (filters?.isActive !== undefined) {
            customers = customers.filter(c => c.isActive === filters.isActive);
        }

        if (filters?.type) {
            customers = customers.filter(c => c.type === filters.type);
        }

        return customers;
    }

    async update(id: string, data: UpdateCustomerDto): Promise<Customer> {
        const customer = await this.findById(id);
        if (!customer) {
            throw new Error('Cliente no encontrado');
        }

        const updated: Customer = {
            ...customer,
            ...data,
            updatedAt: new Date()
        };

        storage.customers.set(id, updated);
        return updated;
    }

    async updateDebt(id: string, amount: number): Promise<Customer> {
        const customer = await this.findById(id);
        if (!customer) {
            throw new Error('Cliente no encontrado');
        }

        const updated: Customer = {
            ...customer,
            currentDebt: amount,
            updatedAt: new Date()
        };

        storage.customers.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        storage.customers.delete(id);
    }
}
