import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SaleService } from '../../application/services/sale.service.js';

const createSaleSchema = z.object({
    customerId: z.string().optional(),
    type: z.enum(['CASH', 'CREDIT']),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK']).optional(),
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().int().positive()
    })).min(1),
    notes: z.string().optional()
});

export function createSaleController(saleService: SaleService): Router {
    const router = Router();
    // Note: authenticate and authorize middlewares are applied at app.ts level

    /**
     * @swagger
     * /api/sales:
     *   post:
     *     summary: Crear venta
     *     tags: [Sales]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - type
     *               - items
     *             properties:
     *               customerId:
     *                 type: string
     *               type:
     *                 type: string
     *                 enum: [CASH, CREDIT]
     *               paymentMethod:
     *                 type: string
     *                 enum: [CASH, TRANSFER, CHECK]
     *               items:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     productId:
     *                       type: string
     *                     quantity:
     *                       type: integer
     *                     unitPrice:
     *                       type: integer
     *               notes:
     *                 type: string
     *     responses:
     *       201:
     *         description: Venta creada exitosamente
     *       400:
     *         description: Error de validación
     *       401:
     *         description: No autorizado
     */
    router.post('/', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');
            const body = createSaleSchema.parse(req.body);

            // Calcular totales simples para el DTO
            let subtotal = 0;
            const items = body.items.map(i => {
                const lineTotal = i.unitPrice * i.quantity;
                subtotal += lineTotal;
                return { ...i, productName: 'Producto', subtotal: lineTotal };
            });

            const sale = await saleService.createSale({
                ...body,
                items,
                branchId: req.user.branchId, // Forzamos sucursal del token
                createdBy: req.user.userId,
                subtotal,
                tax: 0,
                discount: 0,
                total: subtotal
            } as any);

            res.status(201).json(sale);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(400).json({ error: error.message || error });
            }
        }
    });

    /**
     * @swagger
     * /api/sales:
     *   get:
     *     summary: Listar ventas de mi sucursal
     *     tags: [Sales]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de ventas
     *       401:
     *         description: No autorizado
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');
            const sales = await saleService.listSalesByBranch(req.user.branchId);
            res.json(sales);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
