/**
 * Categoría de producto
 */
export interface Category {
    id: string;
    name: string;
    description?: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type CreateCategoryDto = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateCategoryDto = Partial<CreateCategoryDto>;
