import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CreditService } from '../../application/services/credit.service.js';
import { authMiddleware } from '../../infrastructure/web/middlewares/auth.middleware.js';

const registerPaymentSchema = z.object({
    creditAccountId: z.string(),
    amount: z.number().int().positive(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK']),
    reference: z.string().optional(),
    notes: z.string().optional()
});

export function createCreditController(creditService: CreditService): Router {
    const router = Router();
    router.use(authMiddleware);

    /**
     * @swagger
     * /api/credits:
     *   get:
     *     summary: Listar cuentas de crédito (CXC/CPP) de mi sucursal
     *     tags: [Credits]
     *     parameters:
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *           enum: [CXC, CPP]
     *         description: Tipo de cuenta (CXC=Por Cobrar, CPP=Por Pagar)
     *       - in: query
     *         name: status
     *         schema:
     *           type: string
     *           enum: [PENDIENTE, PAGADO_PARCIAL, PAGADO]
     *         description: Estado de la cuenta
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de cuentas de crédito
     *       401:
     *         description: No autorizado
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');
            const type = req.query.type;
            const status = req.query.status;

            const typeValue = Array.isArray(type) ? type[0] : type;
            const statusValue = Array.isArray(status) ? status[0] : status;

            const accounts = await creditService.listCreditAccountsByBranch(
                req.user.branchId,
                {
                    type: typeValue as 'CXC' | 'CPP' | undefined,
                    status: statusValue as any
                }
            );
            res.json(accounts);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/credits/payments:
     *   post:
     *     summary: Registrar un abono a una cuenta
     *     tags: [Credits]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - creditAccountId
     *               - amount
     *               - paymentMethod
     *             properties:
     *               creditAccountId:
     *                 type: string
     *               amount:
     *                 type: integer
     *                 description: Monto del abono en centavos
     *               paymentMethod:
     *                 type: string
     *                 enum: [CASH, TRANSFER, CHECK, DEPOSIT]
     *               reference:
     *                 type: string
     *               notes:
     *                 type: string
     *     responses:
     *       201:
     *         description: Abono registrado exitosamente
     *       400:
     *         description: Error de validación
     */
    router.post('/payments', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');
            const body = registerPaymentSchema.parse(req.body);

            const payment = await creditService.registerPayment(
                body.creditAccountId,
                {
                    creditAccountId: body.creditAccountId,
                    amount: body.amount,
                    paymentMethod: body.paymentMethod,
                    reference: body.reference,
                    notes: body.notes
                },
                req.user.userId
            );

            res.status(201).json(payment);
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
     * /api/credits/{id}/history:
     *   get:
     *     summary: Ver historial de abonos de una cuenta
     *     tags: [Credits]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: ID de la cuenta de crédito
     *     responses:
     *       200:
     *         description: Historial de abonos
     *       500:
     *         description: Error del servidor
     */
    router.get('/:id/history', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const history = await creditService.getPaymentHistory(id);
            res.json(history);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
