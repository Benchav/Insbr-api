import { CreateUnitConversionDto, UnitConversion, UpdateUnitConversionDto } from '../entities/unit-conversion.entity.js';

export interface IUnitConversionRepository {
    create(data: CreateUnitConversionDto): Promise<UnitConversion>;
    findById(id: string): Promise<UnitConversion | null>;
    findByProduct(productId: string): Promise<UnitConversion[]>;
    findByProductAndType(productId: string, unitType: 'BASE' | 'PURCHASE' | 'SALE'): Promise<UnitConversion[]>;
    findByProductAndName(productId: string, unitName: string): Promise<UnitConversion[]>;
    findDuplicates(productId: string, unitName: string, conversionFactor: number): Promise<UnitConversion[]>;
    update(id: string, data: UpdateUnitConversionDto): Promise<UnitConversion>;
    delete(id: string): Promise<void>;
    findAll(): Promise<UnitConversion[]>;
}
