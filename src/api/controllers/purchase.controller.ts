import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PurchaseService } from '../../application/services/purchase.service.js';

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
            const purchases = await purchaseService.listPurchasesByBranch(req.user.branchId);
            res.json(purchases);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
