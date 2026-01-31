import { Request, Response } from 'express';
import { z } from 'zod';
import { UnitConversionService } from '../../application/services/unit-conversion.service.js';

// Esquemas de validación
const createUnitConversionSchema = z.object({
    productId: z.string(),
    unitName: z.string().min(1),
    unitSymbol: z.string().min(1),
    conversionFactor: z.number().positive(),
    unitType: z.enum(['BASE', 'PURCHASE', 'SALE']),
    retailPrice: z.number().int().positive().optional(),
    wholesalePrice: z.number().int().positive().optional(),
    salesType: z.enum(['RETAIL', 'WHOLESALE', 'BOTH']).default('BOTH'),
    isActive: z.boolean().default(true)
});

const updateUnitConversionSchema = createUnitConversionSchema.partial();

const calculatePriceSchema = z.object({
    basePricePerUnit: z.number().int().positive(),
    unitId: z.string(),
    productId: z.string(),
    priceType: z.enum(['retail', 'wholesale']).default('retail')
});

const convertQuantitySchema = z.object({
    quantity: z.number().positive(),
    fromUnitId: z.string(),
    toUnitId: z.string().optional(),
    productId: z.string()
});

/**
 * @swagger
 * /api/products/{productId}/units:
 *   get:
 *     summary: Obtener unidades de conversión de un producto
 *     tags: [Unit Conversions]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista de unidades de conversión
 */
export function getProductUnitsController(unitConversionService: UnitConversionService) {
    return async (req: Request, res: Response) => {
        try {
            const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
            const units = await unitConversionService.getProductUnits(productId);
            res.json(units);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}

/**
 * @swagger
 * /api/products/{productId}/units:
 *   post:
 *     summary: Crear unidad de conversión para un producto
 *     tags: [Unit Conversions]
 */
export function createUnitConversionController(unitConversionService: UnitConversionService) {
    return async (req: Request, res: Response) => {
        try {
            const productId = Array.isArray(req.params.productId) ? req.params.productId[0] : req.params.productId;
            const data = createUnitConversionSchema.parse({ ...req.body, productId });
            const unit = await unitConversionService.createUnitConversion(data);
            res.status(201).json(unit);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Datos inválidos', details: error.issues });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    };
}

/**
 * @swagger
 * /api/units/{unitId}:
 *   put:
 *     summary: Actualizar unidad de conversión
 *     tags: [Unit Conversions]
 */
export function updateUnitConversionController(unitConversionService: UnitConversionService) {
    return async (req: Request, res: Response) => {
        try {
            const unitId = Array.isArray(req.params.unitId) ? req.params.unitId[0] : req.params.unitId;
            const data = updateUnitConversionSchema.parse(req.body);
            const unit = await unitConversionService.updateUnitConversion(unitId, data);
            res.json(unit);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Datos inválidos', details: error.issues });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    };
}

/**
 * @swagger
 * /api/units/{unitId}:
 *   delete:
 *     summary: Eliminar unidad de conversión
 *     tags: [Unit Conversions]
 */
export function deleteUnitConversionController(unitConversionService: UnitConversionService) {
    return async (req: Request, res: Response) => {
        try {
            const unitId = Array.isArray(req.params.unitId) ? req.params.unitId[0] : req.params.unitId;
            await unitConversionService.deleteUnitConversion(unitId);
            res.status(204).send();
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    };
}

/**
 * @swagger
 * /api/units/calculate-price:
 *   post:
 *     summary: Calcular precio para una unidad específica
 *     tags: [Unit Conversions]
 */
export function calculateUnitPriceController(unitConversionService: UnitConversionService) {
    return async (req: Request, res: Response) => {
        try {
            const data = calculatePriceSchema.parse(req.body);
            const price = await unitConversionService.calculateUnitPrice(
                data.basePricePerUnit,
                data.unitId,
                data.productId,
                data.priceType
            );
            res.json({ price });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Datos inválidos', details: error.issues });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    };
}

/**
 * @swagger
 * /api/units/convert:
 *   post:
 *     summary: Convertir cantidad entre unidades
 *     tags: [Unit Conversions]
 */
export function convertQuantityController(unitConversionService: UnitConversionService) {
    return async (req: Request, res: Response) => {
        try {
            const data = convertQuantitySchema.parse(req.body);

            // Convertir a unidad base
            const baseQuantity = await unitConversionService.convertToBase(
                data.quantity,
                data.fromUnitId,
                data.productId
            );

            // Si se especifica unidad destino, convertir a esa unidad
            let convertedQuantity = baseQuantity;
            if (data.toUnitId) {
                convertedQuantity = await unitConversionService.convertFromBase(
                    baseQuantity,
                    data.toUnitId,
                    data.productId
                );
            }

            res.json({
                originalQuantity: data.quantity,
                baseQuantity,
                convertedQuantity,
                fromUnitId: data.fromUnitId,
                toUnitId: data.toUnitId || 'BASE'
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: 'Datos inválidos', details: error.issues });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    };
}
