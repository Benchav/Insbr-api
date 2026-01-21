import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PurchaseService } from '../../application/services/purchase.service.js';
import { getEffectiveBranchId } from '../../infrastructure/web/helpers/branch-access.helper.js';

const createPurchaseSchema = z.object({
    supplierId: z.string(),
    items: z.array(z.object({
        productId: z.string(),
        productName: z.string(),
        quantity: z.number().int().positive(),
        unitCost: z.number().int().positive(),
        subtotal: z.number().int().positive()
    })).min(1),
    subtotal: z.number().int().min(0),
    tax: z.number().int().min(0),
    discount: z.number().int().min(0),
    total: z.number().int().positive(),
    type: z.enum(['CASH', 'CREDIT']),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK']).optional(),
    invoiceNumber: z.string().optional(),
    notes: z.string().optional()
});

export function createPurchaseController(purchaseService: PurchaseService): Router {
    const router = Router();
    // Note: authenticate and authorize middlewares are applied at app.ts level

    /**
     * @swagger
     * /api/purchases:
     *   post:
     *     summary: Registrar compra de mercadería
     *     tags: [Purchases]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - supplierId
     *               - type
     *               - items
     *             properties:
     *               supplierId:
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
     *                     unitCost:
     *                       type: integer
     *                       description: Costo unitario en centavos
     *               notes:
     *                 type: string
     *     responses:
     *       201:
     *         description: Compra registrada exitosamente
     *       400:
     *         description: Error de validación
     *       401:
     *         description: No autorizado
     */
    router.post('/', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');
            const body = createPurchaseSchema.parse(req.body);

            const purchase = await purchaseService.createPurchase({
                ...body,
                branchId: req.user.branchId,
                createdBy: req.user.userId,
                createdAt: new Date()
            } as any);

            res.status(201).json(purchase);
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
     * /api/purchases:
     *   get:
     *     summary: Listar compras de mi sucursal
     *     tags: [Purchases]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de compras
     *       401:
     *         description: No autorizado
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // ADMIN puede especificar branchId en query
            const queryBranchId = req.query.branchId as string | undefined;
            const effectiveBranchId = getEffectiveBranchId(req.user, queryBranchId);

            const purchases = await purchaseService.listPurchasesByBranch(effectiveBranchId || req.user.branchId);
            res.json(purchases);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/purchases/{id}:
     *   put:
     *     summary: Editar compra
     *     description: Permite editar notas y número de factura de compras recientes (últimos 7 días). Solo ADMIN.
     *     tags: [Purchases]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: ID de la compra
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               notes:
     *                 type: string
     *                 description: Notas de la compra
     *               invoiceNumber:
     *                 type: string
     *                 description: Número de factura
     *     responses:
     *       200:
     *         description: Compra actualizada exitosamente
     *       400:
     *         description: Error - Compra muy antigua o campos inválidos
     *       403:
     *         description: Solo ADMIN puede editar compras
     *       404:
     *         description: Compra no encontrada
     */
    router.put('/:id', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // Solo ADMIN puede editar compras
            if (req.user.role !== 'ADMIN') {
                return res.status(403).json({
                    error: 'No autorizado',
                    message: 'Solo los administradores pueden editar compras'
                });
            }

            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const { notes, invoiceNumber } = req.body;

            const purchase = await purchaseService.updatePurchase(id, {
                notes,
                invoiceNumber
            });

            res.json({
                message: 'Compra actualizada exitosamente',
                purchase
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
