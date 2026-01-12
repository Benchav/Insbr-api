import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ProductService } from '../../application/services/product.service.js';

// Esquemas de validación con Zod
const createProductSchema = z.object({
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    description: z.string(),
    sku: z.string().min(3, 'El SKU debe tener al menos 3 caracteres'),
    category: z.string(),
    costPrice: z.number().int().positive('El precio de costo debe ser positivo'),
    retailPrice: z.number().int().positive('El precio al detalle debe ser positivo'),
    wholesalePrice: z.number().int().positive('El precio al por mayor debe ser positivo'),
    unit: z.string(),
    isActive: z.boolean().default(true)
});

const updateProductSchema = createProductSchema.partial();

export function createProductController(productService: ProductService): Router {
    const router = Router();

    /**
     * @swagger
     * /api/products:
     *   get:
     *     summary: Listar todos los productos
     *     tags: [Products]
     *     parameters:
     *       - in: query
     *         name: isActive
     *         schema:
     *           type: boolean
     *         description: Filtrar por estado activo/inactivo
     *       - in: query
     *         name: category
     *         schema:
     *           type: string
     *         description: Filtrar por categoría
     *     responses:
     *       200:
     *         description: Lista de productos
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Product'
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            const filters: any = {};

            if (req.query.isActive !== undefined) {
                filters.isActive = req.query.isActive === 'true';
            }

            if (req.query.category) {
                filters.category = req.query.category as string;
            }

            const products = await productService.listProducts(filters);
            res.json(products);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/products/{id}:
     *   get:
     *     summary: Obtener un producto por ID
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID del producto
     *     responses:
     *       200:
     *         description: Producto encontrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Product'
     *       404:
     *         description: Producto no encontrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.get('/:id', async (req: Request, res: Response) => {
        try {
            const product = await productService.getProduct(req.params.id);
            res.json(product);
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/products:
     *   post:
     *     summary: Crear un nuevo producto
     *     tags: [Products]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - sku
     *               - costPrice
     *               - retailPrice
     *               - wholesalePrice
     *               - unit
     *             properties:
     *               name:
     *                 type: string
     *                 minLength: 3
     *               description:
     *                 type: string
     *               sku:
     *                 type: string
     *                 minLength: 3
     *               category:
     *                 type: string
     *               costPrice:
     *                 type: integer
     *                 description: Precio de costo en centavos
     *               retailPrice:
     *                 type: integer
     *                 description: Precio al detalle en centavos
     *               wholesalePrice:
     *                 type: integer
     *                 description: Precio al por mayor en centavos
     *               unit:
     *                 type: string
     *               isActive:
     *                 type: boolean
     *                 default: true
     *     responses:
     *       201:
     *         description: Producto creado exitosamente
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Product'
     *       400:
     *         description: Datos inválidos
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    router.post('/', async (req: Request, res: Response) => {
        try {
            const data = createProductSchema.parse(req.body);
            const product = await productService.createProduct(data);
            res.status(201).json(product);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.errors });
            } else {
                res.status(400).json({ error: error.message });
            }
        }
    });

    /**
     * @swagger
     * /api/products/{id}:
     *   put:
     *     summary: Actualizar un producto
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID del producto
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *               description:
     *                 type: string
     *               sku:
     *                 type: string
     *               category:
     *                 type: string
     *               costPrice:
     *                 type: integer
     *               retailPrice:
     *                 type: integer
     *               wholesalePrice:
     *                 type: integer
     *               unit:
     *                 type: string
     *               isActive:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Producto actualizado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Product'
     *       400:
     *         description: Datos inválidos
     *       404:
     *         description: Producto no encontrado
     */
    router.put('/:id', async (req: Request, res: Response) => {
        try {
            const data = updateProductSchema.parse(req.body);
            const product = await productService.updateProduct(req.params.id, data);
            res.json(product);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.errors });
            } else {
                res.status(404).json({ error: error.message });
            }
        }
    });

    /**
     * @swagger
     * /api/products/{id}:
     *   delete:
     *     summary: Eliminar un producto
     *     tags: [Products]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID del producto
     *     responses:
     *       204:
     *         description: Producto eliminado exitosamente
     *       404:
     *         description: Producto no encontrado
     */
    router.delete('/:id', async (req: Request, res: Response) => {
        try {
            await productService.deleteProduct(req.params.id);
            res.status(204).send();
        } catch (error: any) {
            res.status(404).json({ error: error.message });
        }
    });

    return router;
}
