import { Category, CreateCategoryDto, UpdateCategoryDto } from '../entities/category.entity.js';

export interface ICategoryRepository {
    create(data: CreateCategoryDto): Promise<Category>;
    findAll(includeInactive?: boolean): Promise<Category[]>;
    findById(id: string): Promise<Category | null>;
    update(id: string, data: UpdateCategoryDto): Promise<Category>;
    delete(id: string): Promise<void>;
    findByName(name: string): Promise<Category | null>;
}
