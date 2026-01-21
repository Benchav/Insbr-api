import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { SupplierService } from '../../application/services/supplier.service.js';

const createSupplierSchema = z.object({
    name: z.string().min(3),
    contactName: z.string().min(3),
    phone: z.string().min(8),
    email: z.string().email().optional(),
    address: z.string().min(5),
    taxId: z.string().optional(),
    creditDays: z.number().int().min(0).default(30),
    creditLimit: z.number().int().min(0)
});

const updateSupplierSchema = createSupplierSchema.partial();

export function createSupplierController(supplierService: SupplierService): Router {
    const router = Router();

    /**
     * @swagger
     * /api/suppliers:
     *   get:
     *     summary: Listar proveedores
     *     tags: [Suppliers]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: isActive
     *         schema:
     *           type: boolean
     *     responses:
     *       200:
     *         description: Lista de proveedores
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            const filters: any = {};

            if (req.query.isActive !== undefined) {
                filters.isActive = req.query.isActive === 'true';
            }

            const suppliers = await supplierService.listSuppliers(filters);
            res.json(suppliers);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/suppliers/{id}:
     *   get:
     *     summary: Obtener proveedor por ID
     *     tags: [Suppliers]
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
     *         description: Proveedor encontrado
     *       404:
     *         description: Proveedor no encontrado
     */
    router.get('/:id', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const supplier = await supplierService.getSupplier(id);
            res.json(supplier);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/suppliers:
     *   post:
     *     summary: Crear nuevo proveedor
     *     tags: [Suppliers]
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
     *               - contactName
     *               - phone
     *               - address
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
     *               creditDays:
     *                 type: integer
     *                 default: 30
     *               creditLimit:
     *                 type: integer
     *     responses:
     *       201:
     *         description: Proveedor creado
     *       400:
     *         description: Datos inválidos
     */
    router.post('/', async (req: Request, res: Response) => {
        try {
            const data = createSupplierSchema.parse(req.body);
            const supplier = await supplierService.createSupplier(data);
            res.status(201).json(supplier);
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
     * /api/suppliers/{id}:
     *   put:
     *     summary: Actualizar proveedor
     *     tags: [Suppliers]
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
     *         description: Proveedor actualizado
     *       404:
     *         description: Proveedor no encontrado
     */
    router.put('/:id', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const data = updateSupplierSchema.parse(req.body);
            const supplier = await supplierService.updateSupplier(id, data);
            res.json(supplier);
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
     * /api/suppliers/{id}:
     *   delete:
     *     summary: Eliminar proveedor
     *     tags: [Suppliers]
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
     *         description: Proveedor eliminado
     *       404:
     *         description: Proveedor no encontrado
     */
    router.delete('/:id', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await supplierService.deleteSupplier(id);
            res.status(204).send();
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    });

    return router;
}
