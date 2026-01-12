import { Product, CreateProductDto, UpdateProductDto } from '../entities/product.entity.js';

export interface IProductRepository {
    create(data: CreateProductDto): Promise<Product>;
    findById(id: string): Promise<Product | null>;
    findBySku(sku: string): Promise<Product | null>;
    findAll(filters?: { isActive?: boolean; category?: string }): Promise<Product[]>;
    update(id: string, data: UpdateProductDto): Promise<Product>;
    delete(id: string): Promise<void>;
}
