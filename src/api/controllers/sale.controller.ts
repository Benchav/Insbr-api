import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SaleService } from '../../application/services/sale.service.js';
import { getEffectiveBranchId } from '../../infrastructure/web/helpers/branch-access.helper.js';

const createSaleSchema = z.object({
    customerId: z.string().optional(),
    type: z.enum(['CASH', 'CREDIT']),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK']).optional(),
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive(),
        unitPrice: z.number().int().positive()
    })).min(1),
    notes: z.string().optional(),
    branchId: z.string().optional()
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

            // Determinar branchId:
            // - Si es ADMIN y envía branchId, usamos ese.
            // - En cualquier otro caso (o si no envía), usamos su branch asignado.
            let targetBranchId = req.user.branchId;
            if (req.user.role === 'ADMIN' && body.branchId) {
                targetBranchId = body.branchId;
            }

            const sale = await saleService.createSale({
                ...body,
                items,
                branchId: targetBranchId,
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
     *     summary: Listar ventas (ADMIN puede filtrar por sucursal)
     *     tags: [Sales]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: branchId
     *         schema:
     *           type: string
     *         description: ID de sucursal (solo para ADMIN, opcional. Use 'all' para todas)
     *     responses:
     *       200:
     *         description: Lista de ventas
     *       401:
     *         description: No autorizado
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // ADMIN puede especificar branchId en query, otros usan su sucursal
            const queryBranchId = req.query.branchId as string | undefined;
            const effectiveBranchId = getEffectiveBranchId(req.user, queryBranchId);

            const sales = await saleService.listSalesByBranch(effectiveBranchId || req.user.branchId);
            res.json(sales);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/sales/{id}/cancel:
     *   post:
     *     summary: Cancelar venta
     *     description: Cancela una venta del día actual y revierte stock, caja y créditos. Todos los roles pueden cancelar.
     *     tags: [Sales]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: ID de la venta
     *     responses:
     *       200:
     *         description: Venta cancelada exitosamente
     *       400:
     *         description: Error - No se puede cancelar (fuera de fecha, con pagos, etc.)
     *       403:
     *         description: Venta fuera de fecha o con pagos registrados
     *       404:
     *         description: Venta no encontrada
     */
    router.post('/:id/cancel', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // Todos los roles pueden cancelar ventas del día actual
            // Esto permite que CAJERO corrija errores inmediatos

            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const sale = await saleService.cancelSale(id, req.user.userId);

            res.json({
                message: 'Venta cancelada exitosamente',
                sale
            });
        } catch (error: any) {
            if (error.message.includes('no encontrada')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    });

    return router;
}
