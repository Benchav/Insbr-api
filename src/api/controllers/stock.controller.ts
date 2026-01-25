import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { StockService } from '../../application/services/stock.service.js';
import { getEffectiveBranchId } from '../../infrastructure/web/helpers/branch-access.helper.js';

const adjustStockSchema = z.object({
    stockId: z.string(),
    newQuantity: z.number().int().min(0),
    reason: z.string().min(3),
    notes: z.string().optional()
});

export function createStockController(stockService: StockService): Router {
    const router = Router();
    // Note: authenticate and authorize middlewares are applied at app.ts level

    /**
     * @swagger
     * /api/stock:
     *   get:
     *     summary: Obtener stock de mi sucursal
     *     tags: [Stock]
     *     parameters:
     *       - in: query
     *         name: categoryId
     *         schema:
     *           type: string
     *         description: Filtrar por ID de categoría
     *       - in: query
     *         name: branchId
     *         schema:
     *           type: string
     *         description: (Admin) ID de sucursal
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de stock con información de productos
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   id:
     *                     type: string
     *                   productId:
     *                     type: string
     *                   branchId:
     *                     type: string
     *                   quantity:
     *                     type: integer
     *                   minStock:
     *                     type: integer
     *                   maxStock:
     *                     type: integer
     *                   product:
     *                     type: object
     *       401:
     *         description: No autorizado
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // ADMIN puede especificar branchId en query
            const queryBranchId = req.query.branchId as string | undefined;
            const categoryId = req.query.categoryId as string | undefined;
            const effectiveBranchId = getEffectiveBranchId(req.user, queryBranchId);

            const stock = await stockService.getStockByBranch(effectiveBranchId || req.user.branchId, categoryId);
            res.json(stock);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/stock/alerts:
     *   get:
     *     summary: Obtener alertas de stock bajo
     *     tags: [Stock]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de productos con stock bajo
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 type: object
     *                 properties:
     *                   stock:
     *                     type: object
     *                   product:
     *                     type: object
     *                   currentQuantity:
     *                     type: integer
     *                   minStock:
     *                     type: integer
     *                   deficit:
     *                     type: integer
     *       401:
     *         description: No autorizado
     */
    router.get('/alerts', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // ADMIN puede especificar branchId en query
            const queryBranchId = req.query.branchId as string | undefined;
            const effectiveBranchId = getEffectiveBranchId(req.user, queryBranchId);

            const alerts = await stockService.getLowStockAlerts(effectiveBranchId || req.user.branchId);
            res.json(alerts);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/stock/product/{id}:
     *   get:
     *     summary: Obtener stock de un producto en todas las sucursales
     *     tags: [Stock]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *         description: ID del producto
     *     responses:
     *       200:
     *         description: Stock del producto en todas las sucursales
     *       401:
     *         description: No autorizado
     */
    router.get('/product/:id', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            const productId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const stocks = await stockService.getStockByProduct(productId);
            res.json(stocks);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/stock/adjust:
     *   post:
     *     summary: Ajustar inventario (solo ADMIN)
     *     tags: [Stock]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - stockId
     *               - newQuantity
     *               - reason
     *             properties:
     *               stockId:
     *                 type: string
     *               newQuantity:
     *                 type: integer
     *                 minimum: 0
     *               reason:
     *                 type: string
     *                 description: Razón del ajuste
     *               notes:
     *                 type: string
     *     responses:
     *       200:
     *         description: Stock ajustado exitosamente
     *       400:
     *         description: Error de validación
     *       401:
     *         description: No autorizado
     *       403:
     *         description: Solo ADMIN puede ajustar stock
     */
    router.post('/adjust', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // Solo ADMIN y GERENTE pueden ajustar stock
            if (req.user.role !== 'ADMIN' && req.user.role !== 'GERENTE') {
                res.status(403).json({
                    error: 'No autorizado',
                    message: 'Solo los administradores y gerentes pueden ajustar el inventario'
                });
                return;
            }

            const body = adjustStockSchema.parse(req.body);

            const updatedStock = await stockService.adjustStock(
                body.stockId,
                body.newQuantity,
                body.reason,
                req.user.userId
            );

            res.json(updatedStock);
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
     * /api/stock/summary:
     *   get:
     *     summary: Obtener resumen de inventario
     *     tags: [Stock]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Resumen del inventario
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 totalUnits:
     *                   type: integer
     *                 totalValue:
     *                   type: integer
     *                   description: Valor total en centavos
     *                 lowStockCount:
     *                   type: integer
     *       401:
     *         description: No autorizado
     */
    router.get('/summary', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            // ADMIN puede especificar branchId en query
            const queryBranchId = req.query.branchId as string | undefined;
            const effectiveBranchId = getEffectiveBranchId(req.user, queryBranchId);
            const branchId = effectiveBranchId || req.user.branchId;

            const totalUnits = await stockService.getTotalUnits(branchId);
            const totalValue = await stockService.getInventoryValue(branchId);
            const alerts = await stockService.getLowStockAlerts(branchId);

            res.json({
                totalUnits,
                totalValue,
                lowStockCount: alerts.length
            });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/stock/adjust:
     *   post:
     *     summary: Ajustar stock manualmente
     *     description: Permite ajustar la cantidad de stock de un producto con auditoría. Solo ADMIN.
     *     tags: [Stock]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - stockId
     *               - newQuantity
     *               - reason
     *             properties:
     *               stockId:
     *                 type: string
     *                 description: ID del registro de stock
     *               newQuantity:
     *                 type: integer
     *                 minimum: 0
     *                 description: Nueva cantidad de stock
     *               reason:
     *                 type: string
     *                 description: Razón del ajuste (merma, corrección, etc.)
     *     responses:
     *       200:
     *         description: Stock ajustado exitosamente
     *       400:
     *         description: Error de validación
     *       401:
     *         description: No autorizado
     */
    router.post('/adjust', async (req: Request, res: Response) => {
        try {
            if (!req.user) throw new Error('No autorizado');

            const { stockId, newQuantity, reason } = req.body;

            if (!stockId || newQuantity === undefined || !reason) {
                return res.status(400).json({
                    error: 'Faltan campos requeridos: stockId, newQuantity, reason'
                });
            }

            const stock = await stockService.adjustStock(
                stockId,
                newQuantity,
                reason,
                req.user.userId
            );

            res.json({
                message: 'Stock ajustado exitosamente',
                stock
            });
        } catch (error: any) {
            res.status(400).json({ error: error.message });
        }
    });

    return router;
}
