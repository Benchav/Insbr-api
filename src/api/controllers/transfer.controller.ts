import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { TransferService } from '../../application/services/transfer.service.js';
import { authMiddleware } from '../../infrastructure/web/middlewares/auth.middleware.js';

const createTransferSchema = z.object({
    toBranchId: z.string(),
    items: z.array(z.object({
        productId: z.string(),
        quantity: z.number().int().positive()
    })).min(1),
    notes: z.string().optional()
});

export function createTransferController(transferService: TransferService): Router {
    const router = Router();
    router.use(authMiddleware);

    /**
     * @swagger
     * /api/transfers:
     *   post:
     *     summary: Solicitar transferencia
     *     tags: [Transfers]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - toBranchId
     *               - items
     *             properties:
     *               toBranchId:
     *                 type: string
     *               items:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     productId:
     *                       type: string
     *                     quantity:
     *                       type: integer
     *               notes:
     *                 type: string
     *     responses:
     *       201:
     *         description: Transferencia creada
     *       400:
     *         description: Error de validación
     */
    router.post('/', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');
            const body = createTransferSchema.parse(req.body);

            const transfer = await transferService.createTransfer({
                fromBranchId: req.user.branchId,
                toBranchId: body.toBranchId,
                items: body.items.map(i => ({ ...i, productName: 'Transfer Item' })),
                notes: body.notes,
                createdBy: req.user.userId,
                createdAt: new Date(),
                status: 'PENDING'
            } as any);

            res.status(201).json(transfer);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    });

    /**
     * @swagger
     * /api/transfers/{id}/approve:
     *   patch:
     *     summary: Aprobar transferencia
     *     tags: [Transfers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Transferencia aprobada
     *       400:
     *         description: Error
     */
    router.patch('/:id/approve', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const transfer = await transferService.approveTransfer(id, req.user.userId);
            res.json(transfer);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/transfers/{id}/complete:
     *   patch:
     *     summary: Completar transferencia
     *     tags: [Transfers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Transferencia completada
     *       400:
     *         description: Error
     */
    router.patch('/:id/complete', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const transfer = await transferService.completeTransfer(id, req.user.userId);
            res.json(transfer);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    return router;
}
