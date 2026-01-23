import { ICustomerRepository } from '../../core/interfaces/customer.repository.js';
import { Customer } from '../../core/entities/customer.entity.js';

export class CustomerService {
    constructor(private customerRepository: ICustomerRepository) { }

    async createCustomer(data: {
        name: string;
        contactName?: string;
        phone: string;
        email?: string;
        address: string;
        taxId?: string;
        creditLimit: number;
        creditDays?: number; // Días de crédito (opcional, default 30)
        type: 'RETAIL' | 'WHOLESALE';
    }): Promise<Customer> {
        return this.customerRepository.create({
            ...data,
            creditDays: data.creditDays || 30, // Default 30 días
            isActive: true
        });
    }

    async getCustomer(id: string): Promise<Customer> {
        const customer = await this.customerRepository.findById(id);
        if (!customer) {
            throw new Error('Cliente no encontrado');
        }
        return customer;
    }

    async listCustomers(filters?: { type?: 'RETAIL' | 'WHOLESALE'; isActive?: boolean }): Promise<Customer[]> {
        return this.customerRepository.findAll(filters);
    }

    async updateCustomer(id: string, data: Partial<Customer>): Promise<Customer> {
        const customer = await this.customerRepository.findById(id);
        if (!customer) {
            throw new Error('Cliente no encontrado');
        }
        return this.customerRepository.update(id, data);
    }

    async deleteCustomer(id: string): Promise<void> {
        const customer = await this.customerRepository.findById(id);
        if (!customer) {
            throw new Error('Cliente no encontrado');
        }
        await this.customerRepository.delete(id);
    }

    async updateDebt(id: string, amount: number): Promise<Customer> {
        return this.customerRepository.updateDebt(id, amount);
    }
}
