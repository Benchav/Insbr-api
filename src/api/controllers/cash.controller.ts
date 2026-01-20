import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CashService } from '../../application/services/cash.service.js';

const registerMovementSchema = z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    category: z.enum(['SALE', 'PURCHASE', 'CREDIT_PAYMENT', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT']),
    amount: z.number().int().positive(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK']),
    reference: z.string().optional(),
    description: z.string().min(3),
    notes: z.string().optional()
});

export function createCashController(cashService: CashService): Router {
    const router = Router();
    // Note: authenticate and authorize middlewares are applied at app.ts level

    /**
     * @swagger
     * /api/cash/balance:
     *   get:
     *     summary: Obtener balance de caja del día
     *     tags: [Cash]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: date
     *         schema:
     *           type: string
     *           format: date
     *         description: Fecha del balance (default: hoy)
     *     responses:
     *       200:
     *         description: Balance de caja
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 date:
     *                   type: string
     *                   format: date-time
     *                 income:
     *                   type: integer
     *                   description: Ingresos en centavos
     *                 expenses:
     *                   type: integer
     *                   description: Egresos en centavos
     *                 netBalance:
     *                   type: integer
     *                   description: Balance neto en centavos
     *                 movements:
     *                   type: array
     *                   items:
     *                     type: object
     *       401:
     *         description: No autorizado
     */
    router.get('/balance', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            const dateParam = req.query.date;
            const date = dateParam ? new Date(dateParam as string) : new Date();

            const balance = await cashService.getDailyBalance(req.user.branchId, date);
            res.json(balance);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/cash/movements:
     *   get:
     *     summary: Listar movimientos de caja
     *     tags: [Cash]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: startDate
     *         schema:
     *           type: string
     *           format: date
     *       - in: query
     *         name: endDate
     *         schema:
     *           type: string
     *           format: date
     *     responses:
     *       200:
     *         description: Lista de movimientos
     *       401:
     *         description: No autorizado
     */
    router.get('/movements', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            const startDateParam = req.query.startDate as string;
            const endDateParam = req.query.endDate as string;

            const startDate = startDateParam ? new Date(startDateParam) : new Date(new Date().setHours(0, 0, 0, 0));
            const endDate = endDateParam ? new Date(endDateParam) : new Date(new Date().setHours(23, 59, 59, 999));

            const movements = await cashService.getCashFlow(req.user.branchId, startDate, endDate);
            res.json(movements);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/cash/movements:
     *   post:
     *     summary: Registrar movimiento de caja manual
     *     tags: [Cash]
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
     *               - category
     *               - amount
     *               - paymentMethod
     *               - description
     *             properties:
     *               type:
     *                 type: string
     *                 enum: [INCOME, EXPENSE]
     *               category:
     *                 type: string
     *                 enum: [EXPENSE, ADJUSTMENT]
     *               amount:
     *                 type: integer
     *                 description: Monto en centavos
     *               paymentMethod:
     *                 type: string
     *                 enum: [CASH, TRANSFER, CHECK]
     *               reference:
     *                 type: string
     *               description:
     *                 type: string
     *               notes:
     *                 type: string
     *     responses:
     *       201:
     *         description: Movimiento registrado
     *       400:
     *         description: Error de validación
     *       401:
     *         description: No autorizado
     */
    router.post('/movements', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // Solo ADMIN puede registrar movimientos manuales
            if (req.user.role !== 'ADMIN') {
                res.status(403).json({
                    error: 'No autorizado',
                    message: 'Solo los administradores pueden registrar movimientos manuales de caja'
                });
                return;
            }

            const body = registerMovementSchema.parse(req.body);

            const movement = await cashService.registerManualMovement({
                branchId: req.user.branchId,
                type: body.type,
                category: body.category,
                amount: body.amount,
                paymentMethod: body.paymentMethod,
                reference: body.reference,
                description: body.description,
                notes: body.notes,
                createdBy: req.user.userId
            });

            res.status(201).json(movement);
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
     * /api/cash/daily-revenue:
     *   get:
     *     summary: Obtener ingreso total del día
     *     tags: [Cash]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: date
     *         schema:
     *           type: string
     *           format: date
     *     responses:
     *       200:
     *         description: Ingreso total en centavos
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 date:
     *                   type: string
     *                 income:
     *                   type: integer
     *       401:
     *         description: No autorizado
     */
    router.get('/daily-revenue', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            const dateParam = req.query.date;
            const date = dateParam ? new Date(dateParam as string) : new Date();

            const income = await cashService.getDailyIncome(req.user.branchId, date);
            res.json({ date, income });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
