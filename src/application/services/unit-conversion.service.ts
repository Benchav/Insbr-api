import { IUnitConversionRepository } from '../../core/interfaces/unit-conversion.repository.js';
import { CreateUnitConversionDto, UnitConversion, UpdateUnitConversionDto } from '../../core/entities/unit-conversion.entity.js';

export class UnitConversionService {
    constructor(private unitConversionRepository: IUnitConversionRepository) { }

    /**
     * Convierte cantidad de una unidad específica a unidad base
     * @param quantity Cantidad en la unidad especificada
     * @param fromUnitId ID de la unidad desde la que convertir
     * @param productId ID del producto (para validación)
     * @returns Cantidad convertida a unidad base
     */
    async convertToBase(
        quantity: number,
        fromUnitId: string,
        productId: string
    ): Promise<number> {
        const unit = await this.unitConversionRepository.findById(fromUnitId);

        if (!unit) {
            throw new Error(`Unidad de conversión no encontrada: ${fromUnitId}`);
        }

        if (unit.productId !== productId) {
            throw new Error('La unidad no pertenece al producto especificado');
        }

        if (!unit.isActive) {
            throw new Error('La unidad de conversión está inactiva');
        }

        // Cantidad en unidad base = cantidad × factor de conversión
        return quantity * unit.conversionFactor;
    }

    /**
     * Convierte cantidad de unidad base a otra unidad específica
     * @param baseQuantity Cantidad en unidad base
     * @param toUnitId ID de la unidad a la que convertir
     * @param productId ID del producto (para validación)
     * @returns Cantidad convertida a la unidad especificada
     */
    async convertFromBase(
        baseQuantity: number,
        toUnitId: string,
        productId: string
    ): Promise<number> {
        const unit = await this.unitConversionRepository.findById(toUnitId);

        if (!unit) {
            throw new Error(`Unidad de conversión no encontrada: ${toUnitId}`);
        }

        if (unit.productId !== productId) {
            throw new Error('La unidad no pertenece al producto especificado');
        }

        if (!unit.isActive) {
            throw new Error('La unidad de conversión está inactiva');
        }

        // Cantidad en unidad específica = cantidad base ÷ factor de conversión
        return baseQuantity / unit.conversionFactor;
    }

    /**
     * Obtiene todas las unidades de conversión de un producto
     * @param productId ID del producto
     * @returns Lista de unidades de conversión
     */
    async getProductUnits(productId: string): Promise<UnitConversion[]> {
        return this.unitConversionRepository.findByProduct(productId);
    }

    /**
     * Obtiene la unidad base de un producto
     * @param productId ID del producto
     * @returns Unidad base o null si no existe
     */
    async getBaseUnit(productId: string): Promise<UnitConversion | null> {
        const baseUnits = await this.unitConversionRepository.findByProductAndType(productId, 'BASE');
        return baseUnits.length > 0 ? baseUnits[0] : null;
    }

    /**
     * Calcula el precio para una unidad específica basado en el precio base
     * @param basePricePerUnit Precio por unidad base (en centavos)
     * @param unitId ID de la unidad
     * @param productId ID del producto
     * @param priceType Tipo de precio ('retail' o 'wholesale')
     * @returns Precio calculado para la unidad (en centavos)
     */
    async calculateUnitPrice(
        basePricePerUnit: number,
        unitId: string,
        productId: string,
        priceType: 'retail' | 'wholesale' = 'retail'
    ): Promise<number> {
        const unit = await this.unitConversionRepository.findById(unitId);

        if (!unit) {
            throw new Error(`Unidad de conversión no encontrada: ${unitId}`);
        }

        if (unit.productId !== productId) {
            throw new Error('La unidad no pertenece al producto especificado');
        }

        // Si la unidad tiene precio específico, usarlo
        if (priceType === 'retail' && unit.retailPrice) {
            return unit.retailPrice;
        }

        if (priceType === 'wholesale' && unit.wholesalePrice) {
            return unit.wholesalePrice;
        }

        // Si no tiene precio específico, calcular: precio_base × factor_conversión
        return Math.round(basePricePerUnit * unit.conversionFactor);
    }

    /**
     * Crea una nueva unidad de conversión
     * @param data Datos de la unidad de conversión
     * @returns Unidad de conversión creada
     */
    async createUnitConversion(data: CreateUnitConversionDto): Promise<UnitConversion> {
        // Validar que el factor de conversión sea positivo
        if (data.conversionFactor <= 0) {
            throw new Error('El factor de conversión debe ser mayor que 0');
        }

        // Si es unidad base, el factor debe ser 1
        if (data.unitType === 'BASE' && data.conversionFactor !== 1) {
            throw new Error('La unidad base debe tener factor de conversión = 1');
        }

        // Verificar que no exista ya una unidad base si estamos creando una
        if (data.unitType === 'BASE') {
            const existingBase = await this.getBaseUnit(data.productId);
            if (existingBase) {
                throw new Error('El producto ya tiene una unidad base definida');
            }
        }

        return this.unitConversionRepository.create(data);
    }

    /**
     * Actualiza una unidad de conversión
     * @param id ID de la unidad de conversión
     * @param data Datos a actualizar
     * @returns Unidad de conversión actualizada
     */
    async updateUnitConversion(id: string, data: UpdateUnitConversionDto): Promise<UnitConversion> {
        // Validar factor de conversión si se está actualizando
        if (data.conversionFactor !== undefined && data.conversionFactor <= 0) {
            throw new Error('El factor de conversión debe ser mayor que 0');
        }

        return this.unitConversionRepository.update(id, data);
    }

    /**
     * Elimina una unidad de conversión
     * @param id ID de la unidad de conversión
     */
    async deleteUnitConversion(id: string): Promise<void> {
        const unit = await this.unitConversionRepository.findById(id);

        if (!unit) {
            throw new Error('Unidad de conversión no encontrada');
        }

        // No permitir eliminar la unidad base
        if (unit.unitType === 'BASE') {
            throw new Error('No se puede eliminar la unidad base del producto');
        }

        await this.unitConversionRepository.delete(id);
    }

    /**
     * Obtiene todas las unidades de conversión
     * @returns Lista de todas las unidades de conversión
     */
    async getAllUnitConversions(): Promise<UnitConversion[]> {
        return this.unitConversionRepository.findAll();
    }
}
