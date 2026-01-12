import { IProductRepository } from '../../core/interfaces/product.repository.js';
import { CreateProductDto, UpdateProductDto, Product } from '../../core/entities/product.entity.js';

export class ProductService {
    constructor(private productRepository: IProductRepository) { }

    async createProduct(data: CreateProductDto): Promise<Product> {
        // Validar que el SKU no exista
        const existing = await this.productRepository.findBySku(data.sku);
        if (existing) {
            throw new Error(`El producto con SKU ${data.sku} ya existe`);
        }

        // Validar precios
        if (data.costPrice <= 0 || data.retailPrice <= 0 || data.wholesalePrice <= 0) {
            throw new Error('Los precios deben ser mayores a cero');
        }

        if (data.retailPrice < data.costPrice) {
            throw new Error('El precio al detalle no puede ser menor al costo');
        }

        if (data.wholesalePrice < data.costPrice) {
            throw new Error('El precio al por mayor no puede ser menor al costo');
        }

        return this.productRepository.create(data);
    }

    async getProduct(id: string): Promise<Product> {
        const product = await this.productRepository.findById(id);
        if (!product) {
            throw new Error('Producto no encontrado');
        }
        return product;
    }

    async listProducts(filters?: { isActive?: boolean; category?: string }): Promise<Product[]> {
        return this.productRepository.findAll(filters);
    }

    async updateProduct(id: string, data: UpdateProductDto): Promise<Product> {
        const product = await this.getProduct(id);

        // Si se actualiza el SKU, validar que no exista
        if (data.sku && data.sku !== product.sku) {
            const existing = await this.productRepository.findBySku(data.sku);
            if (existing) {
                throw new Error(`El producto con SKU ${data.sku} ya existe`);
            }
        }

        return this.productRepository.update(id, data);
    }

    async deleteProduct(id: string): Promise<void> {
        await this.getProduct(id);
        await this.productRepository.delete(id);
    }
}
