import { Router, Request, Response } from 'express';
import { CategoryService } from '../../application/services/category.service.js';
import { z } from 'zod';

const createCategorySchema = z.object({
    name: z.string().min(1, "El nombre es obligatorio"),
    description: z.string().optional(),
    isActive: z.boolean().optional().default(true)
});

const updateCategorySchema = createCategorySchema.partial();

export function createCategoryController(categoryService: CategoryService): Router {
    const router = Router();

    /**
     * @swagger
     * /api/categories:
     *   get:
     *     summary: Listar categorías
     *     tags: [Categories]
     *     responses:
     *       200:
     *         description: Lista de categorías
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            const categories = await categoryService.getAllCategories();
            res.json(categories);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/categories:
     *   post:
     *     summary: Crear categoría
     *     tags: [Categories]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [name]
     *             properties:
     *               name:
     *                 type: string
     *               description:
     *                 type: string
     *     responses:
     *       201:
     *         description: Categoría creada
     */
    router.post('/', async (req: Request, res: Response) => {
        try {
            const body = createCategorySchema.parse(req.body);
            const category = await categoryService.createCategory(body);
            res.status(201).json(category);
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
     * /api/categories/{id}:
     *   put:
     *     summary: Actualizar categoría
     *     tags: [Categories]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     requestBody:
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               name:
     *                 type: string
     *               description:
     *                 type: string
     *               isActive:
     *                 type: boolean
     *     responses:
     *       200:
     *         description: Categoría actualizada
     */
    router.put('/:id', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const body = updateCategorySchema.parse(req.body);
            const category = await categoryService.updateCategory(id, body);
            res.json(category);
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/categories/{id}:
     *   delete:
     *     summary: Eliminar categoría
     *     tags: [Categories]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Categoría eliminada
     */
    router.delete('/:id', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            await categoryService.deleteCategory(id);
            res.json({ message: 'Categoría eliminada' });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    return router;
}
