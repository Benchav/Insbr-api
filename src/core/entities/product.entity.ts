/**
 * Producto del catálogo compartido entre sucursales
 */
export interface Product {
  id: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  
  // Precios en centavos para evitar errores de punto flotante
  costPrice: number;      // Precio de costo
  retailPrice: number;    // Precio al detalle
  wholesalePrice: number; // Precio al por mayor
  
  // Unidad de medida
  unit: string; // ej: "kg", "unidad", "litro"
  
  // Metadata
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type CreateProductDto = Omit<Product, 'id' | 'createdAt' | 'updatedAt'>;
export type UpdateProductDto = Partial<CreateProductDto>;
