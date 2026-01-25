import { ICategoryRepository } from '../../core/interfaces/category.repository.js';
import { CreateCategoryDto, UpdateCategoryDto, Category } from '../../core/entities/category.entity.js';

export class CategoryService {
    constructor(private categoryRepository: ICategoryRepository) { }

    async createCategory(data: CreateCategoryDto): Promise<Category> {
        const existing = await this.categoryRepository.findByName(data.name);
        if (existing) {
            throw new Error(`La categoría '${data.name}' ya existe.`);
        }
        return this.categoryRepository.create(data);
    }

    async getAllCategories(): Promise<Category[]> {
        return this.categoryRepository.findAll(true); // Incluir inactivas para administración
    }

    async getActiveCategories(): Promise<Category[]> {
        return this.categoryRepository.findAll(false);
    }

    async updateCategory(id: string, data: UpdateCategoryDto): Promise<Category> {
        if (data.name) {
            const existing = await this.categoryRepository.findByName(data.name);
            if (existing && existing.id !== id) {
                throw new Error(`La categoría '${data.name}' ya existe.`);
            }
        }
        return this.categoryRepository.update(id, data);
    }

    async deleteCategory(id: string): Promise<void> {
        // TODO: Verificar si hay productos usando esta categoría antes de eliminar
        // Por ahora, confiamos en la restricción de llave foránea o el usuario.
        await this.categoryRepository.delete(id);
    }
}
