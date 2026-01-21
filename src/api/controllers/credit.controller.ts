import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CreditService } from '../../application/services/credit.service.js';
import { getEffectiveBranchId } from '../../infrastructure/web/helpers/branch-access.helper.js';

const registerPaymentSchema = z.object({
    creditAccountId: z.string(),
    amount: z.number().int().positive(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK']),
    reference: z.string().optional(),
    notes: z.string().optional()
});

const updateDetailsSchema = z.object({
    deliveryDate: z.string().optional(),
    notes: z.string().optional()
});

export function createCreditController(creditService: CreditService): Router {
    const router = Router();
    // Note: authenticate and authorize middlewares are applied at app.ts level

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

            // ADMIN puede especificar branchId en query
            const queryBranchId = req.query.branchId as string | undefined;
            const effectiveBranchId = getEffectiveBranchId(req.user, queryBranchId);

            const accounts = await creditService.listCreditAccountsByBranch(
                effectiveBranchId || req.user.branchId,
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

    /**
     * @swagger
     * /api/credits/{id}:
     *   delete:
     *     summary: Cancelar cuenta de crédito
     *     description: Cancela una cuenta de crédito que no tenga pagos registrados. Solo ADMIN y GERENTE.
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
     *         description: Cuenta cancelada exitosamente
     *       400:
     *         description: Error - Cuenta tiene pagos registrados
     *       403:
     *         description: Solo ADMIN y GERENTE pueden cancelar cuentas
     *       404:
     *         description: Cuenta no encontrada
     */
    router.delete('/:id', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // Solo ADMIN y GERENTE pueden cancelar cuentas de crédito
            if (req.user.role !== 'ADMIN' && req.user.role !== 'GERENTE') {
                return res.status(403).json({
                    error: 'No autorizado',
                    message: 'Solo los administradores y gerentes pueden cancelar cuentas de crédito'
                });
            }

            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await creditService.cancelCreditAccount(id);

            res.json({ message: 'Cuenta de crédito cancelada exitosamente' });
        } catch (error: any) {
            if (error.message.includes('no encontrada')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    });

    /**
     * @swagger
     * /api/credits/{id}/details:
     *   patch:
     *     summary: Actualizar detalles de un encargo (fecha de entrega, notas)
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
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               deliveryDate:
     *                 type: string
     *                 format: date
     *                 description: Nueva fecha de entrega
     *               notes:
     *                 type: string
     *                 description: Notas del encargo
     *     responses:
     *       200:
     *         description: Detalles actualizados exitosamente
     *       400:
     *         description: Error - Cuenta ya pagada o no encontrada
     *       403:
     *         description: Solo ADMIN y GERENTE pueden actualizar detalles
     */
    router.patch('/:id/details', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // Solo ADMIN y GERENTE pueden actualizar detalles
            if (req.user.role !== 'ADMIN' && req.user.role !== 'GERENTE') {
                return res.status(403).json({
                    error: 'No autorizado',
                    message: 'Solo los administradores y gerentes pueden actualizar detalles de encargos'
                });
            }

            const body = updateDetailsSchema.parse(req.body);
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            // Validar que la cuenta existe
            const account = await creditService.getCreditAccount(id);

            // No permitir editar cuentas ya pagadas
            if (account.status === 'PAGADO') {
                return res.status(400).json({
                    error: 'No se puede modificar una cuenta ya pagada completamente'
                });
            }

            // Acceder al repository directamente desde el service
            const creditAccountRepository = (creditService as any).creditAccountRepository;

            // Actualizar detalles
            await creditAccountRepository.update(id, {
                deliveryDate: body.deliveryDate ? new Date(body.deliveryDate) : undefined,
                notes: body.notes
            });

            res.json({ message: 'Detalles actualizados correctamente' });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else if (error.message.includes('no encontrada')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    });

    return router;
}
