import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CustomerService } from '../../application/services/customer.service.js';

const createCustomerSchema = z.object({
    name: z.string().min(3),
    contactName: z.string().optional(),
    phone: z.string().min(8),
    email: z.string().email().optional(),
    address: z.string().min(5),
    taxId: z.string().optional(),
    creditLimit: z.number().int().min(0),
    creditDays: z.number().int().min(1).max(365).default(30), // Días de crédito (1-365)
    type: z.enum(['RETAIL', 'WHOLESALE'])
});

const updateCustomerSchema = createCustomerSchema.partial();

export function createCustomerController(customerService: CustomerService): Router {
    const router = Router();

    /**
     * @swagger
     * /api/customers:
     *   get:
     *     summary: Listar clientes
     *     tags: [Customers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: type
     *         schema:
     *           type: string
     *           enum: [RETAIL, WHOLESALE]
     *       - in: query
     *         name: isActive
     *         schema:
     *           type: boolean
     *     responses:
     *       200:
     *         description: Lista de clientes
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            const filters: any = {};

            if (req.query.type) {
                filters.type = req.query.type as 'RETAIL' | 'WHOLESALE';
            }

            if (req.query.isActive !== undefined) {
                filters.isActive = req.query.isActive === 'true';
            }

            const customers = await customerService.listCustomers(filters);
            res.json(customers);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/customers/{id}:
     *   get:
     *     summary: Obtener cliente por ID
     *     tags: [Customers]
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
     *         description: Cliente encontrado
     *       404:
     *         description: Cliente no encontrado
     */
    router.get('/:id', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const customer = await customerService.getCustomer(id);
            res.json(customer);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/customers:
     *   post:
     *     summary: Crear nuevo cliente
     *     tags: [Customers]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - phone
     *               - address
     *               - type
     *               - creditLimit
     *             properties:
     *               name:
     *                 type: string
     *               contactName:
     *                 type: string
     *               phone:
     *                 type: string
     *               email:
     *                 type: string
     *               address:
     *                 type: string
     *               taxId:
     *                 type: string
     *               creditLimit:
     *                 type: integer
     *                 description: Límite de crédito en centavos
     *               creditDays:
     *                 type: integer
     *                 minimum: 1
     *                 maximum: 365
     *                 default: 30
     *                 description: Días de crédito permitidos para calcular fecha de vencimiento
     *               type:
     *                 type: string
     *                 enum: [RETAIL, WHOLESALE]
     *     responses:
     *       201:
     *         description: Cliente creado
     *       400:
     *         description: Datos inválidos
     */
    router.post('/', async (req: Request, res: Response) => {
        try {
            const data = createCustomerSchema.parse(req.body);
            const customer = await customerService.createCustomer(data);
            res.status(201).json(customer);
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
     * /api/customers/{id}:
     *   put:
     *     summary: Actualizar cliente
     *     tags: [Customers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *     responses:
     *       200:
     *         description: Cliente actualizado
     *       404:
     *         description: Cliente no encontrado
     */
    router.put('/:id', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const data = updateCustomerSchema.parse(req.body);
            const customer = await customerService.updateCustomer(id, data);
            res.json(customer);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
            } else if (error.message.includes('no encontrado')) {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    });

    /**
     * @swagger
     * /api/customers/{id}:
     *   delete:
     *     summary: Eliminar cliente
     *     tags: [Customers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       204:
     *         description: Cliente eliminado
     *       404:
     *         description: Cliente no encontrado
     */
    router.delete('/:id', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await customerService.deleteCustomer(id);
            res.status(204).send();
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    });

    return router;
}
