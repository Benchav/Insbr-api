import { IProductRepository } from '../../../core/interfaces/product.repository.js';
import { Product, CreateProductDto, UpdateProductDto } from '../../../core/entities/product.entity.js';
import { storage } from '../storage.js';
import { randomUUID } from 'crypto';

export class ProductRepositoryImpl implements IProductRepository {
    async create(data: CreateProductDto): Promise<Product> {
        const product: Product = {
            id: randomUUID(),
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        storage.products.set(product.id, product);
        return product;
    }

    async findById(id: string): Promise<Product | null> {
        return storage.products.get(id) || null;
    }

    async findBySku(sku: string): Promise<Product | null> {
        for (const product of storage.products.values()) {
            if (product.sku === sku) {
                return product;
            }
        }
        return null;
    }

    async findAll(filters?: { isActive?: boolean; category?: string }): Promise<Product[]> {
        let products = Array.from(storage.products.values());

        if (filters?.isActive !== undefined) {
            products = products.filter(p => p.isActive === filters.isActive);
        }

        if (filters?.category) {
            products = products.filter(p => p.category === filters.category);
        }

        return products;
    }

    async update(id: string, data: UpdateProductDto): Promise<Product> {
        const product = await this.findById(id);
        if (!product) {
            throw new Error('Producto no encontrado');
        }

        const updated: Product = {
            ...product,
            ...data,
            updatedAt: new Date()
        };

        storage.products.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        storage.products.delete(id);
    }
}
