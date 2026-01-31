/**
 * Conversión de unidades de medida para productos
 * Permite comprar en unidades grandes y vender en unidades pequeñas
 */

export type UnitType = 'BASE' | 'PURCHASE' | 'SALE';
export type SalesType = 'RETAIL' | 'WHOLESALE' | 'BOTH';

export interface UnitConversion {
    id: string;
    productId: string;
    unitName: string;           // "Quintal", "Libra", "Medio Quintal", "Caja"
    unitSymbol: string;         // "qq", "lb", "1/2 qq", "caja"
    conversionFactor: number;   // Factor para convertir a unidad base
    unitType: UnitType;

    // Precios específicos por unidad (opcionales, en centavos)
    retailPrice?: number;       // Precio al menudeo para esta unidad
    wholesalePrice?: number;    // Precio al mayoreo para esta unidad

    // Clasificación de venta
    salesType: SalesType;       // Tipo de venta permitida

    isActive: boolean;
    createdAt: Date;
}

export type CreateUnitConversionDto = Omit<UnitConversion, 'id' | 'createdAt'>;
export type UpdateUnitConversionDto = Partial<CreateUnitConversionDto>;
