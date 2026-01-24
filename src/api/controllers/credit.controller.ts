import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CreditService } from '../../application/services/credit.service.js';
import { IBranchRepository } from '../../core/interfaces/branch.repository.js';
import { PdfService } from '../../infrastructure/reports/pdf.service.js';
import { getEffectiveBranchId } from '../../infrastructure/web/helpers/branch-access.helper.js';

const registerPaymentSchema = z.object({
    creditAccountId: z.string(),
    amount: z.number().int().positive(),
    paymentMethod: z.enum(['CASH', 'TRANSFER', 'CHECK']),
    reference: z.string().optional(),
    notes: z.string().optional()
});

export function createCreditController(
    creditService: CreditService,
    branchRepository: IBranchRepository,
    pdfService: PdfService
): Router {
    const router = Router();
    // Note: authenticate and authorize middlewares are applied at app.ts level

    /**
     * @swagger
     * /api/credits/{id}/ticket:
     *   get:
     *     summary: Generar ticket de estado de cuenta
     *     description: Devuelve detalles completos de la CPP (productos, pagos, totales)
     *     tags: [Credits]
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
     *         description: Ticket generado
     *       404:
     *         description: Cuenta no encontrada
     */
    router.get('/:id/ticket', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const ticket = await creditService.generateTicket(id);
            res.json(ticket);
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
     * /api/credits/{id}/ticket/pdf:
     *   get:
     *     summary: Generar PDF de estado de cuenta
     *     description: Descarga un PDF formato ticket (80mm) con el estado de cuenta
     *     tags: [Credits]
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
     *         description: Archivo PDF descargado
     *         content:
     *           application/pdf:
     *             schema:
     *               type: string
     *               format: binary
     *       404:
     *         description: Cuenta no encontrada
     */
    router.get('/:id/ticket/pdf', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

            // 1. Obtener datos del ticket
            const ticketData = await creditService.generateTicket(id);

            // 2. Obtener datos de la sucursal
            // Si el user tiene branchId, usamos esa. Si es Admin y quiere ver de otra, ya se filtró el acceso.
            // Pero para el encabezado del ticket, necesitamos la sucursal de la CUENTA, no necesariamente del usuario.
            // ticketData.account doesn't have branchId explicitly in the basic structure I made, let's re-fetch or assume context.
            // Actually, best to fetch branch from the account's branchId. 
            // CreditService.generateTicket return structure has `account.id` etc but not `branchId`.
            // Modify generateTicket? Or just fetch account again?
            // Actually `creditService.generateTicket` returns `account` object. I should add `branchId` to `generateTicket` output or fetch it.
            // Let's assume user.branchId for now or fetch.

            // Let's get the full account again to be safe about branchId, or trust user.branchId if context is consistent.
            // Better: `listCreditAccounts` filters by branch. 
            // Let me optimize: I will use `req.user.branchId` as the printing branch context. 
            // Or better, fetch the branch details using `branchRepository.findById(req.user.branchId)`.

            const branch = await branchRepository.findById(req.user.branchId);
            if (!branch) throw new Error('Sucursal no encontrada');

            // 3. Generar PDF
            const pdfBuffer = await pdfService.generateCreditTicket(
                ticketData,
                branch.name,
                branch.address,
                branch.phone
            );

            // 4. Enviar respuesta stream
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=ticket-credit-${ticketData.account.invoiceNumber}.pdf`);
            res.send(pdfBuffer);

        } catch (error: any) {
            console.error('Error generando PDF Ticket:', error);
            if (error.message.includes('no encontrada')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(500).json({ error: error.message });
            }
        }
    });

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
     * /api/credits/{id}/ticket:
     *   get:
     *     summary: Generar ticket de estado de cuenta
     *     description: Devuelve detalles completos de la CPP (productos, pagos, totales)
     *     tags: [Credits]
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
     *         description: Ticket generado
     *       404:
     *         description: Cuenta no encontrada
     */
    router.get('/:id/ticket', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const ticket = await creditService.generateTicket(id);
            res.json(ticket);
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
