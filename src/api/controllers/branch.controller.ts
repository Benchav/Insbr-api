import { Router, Request, Response } from 'express';
import { IBranchRepository } from '../../core/interfaces/branch.repository.js';

export function createBranchController(branchRepository: IBranchRepository): Router {
    const router = Router();

    /**
     * @swagger
     * /api/branches:
     *   get:
     *     summary: Listar todas las sucursales
     *     tags: [Branches]
     *     responses:
     *       200:
     *         description: Lista de sucursales
     */
    router.get('/', async (req: Request, res: Response) => {
        try {
            const branches = await branchRepository.findAll();
            res.json(branches);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    /**
     * @swagger
     * /api/branches/{id}:
     *   get:
     *     summary: Obtener sucursal por ID
     *     tags: [Branches]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *     responses:
     *       200:
     *         description: Detalles de la sucursal
     */
    router.get('/:id', async (req: Request, res: Response) => {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            const branch = await branchRepository.findById(id);
            if (!branch) {
                return res.status(404).json({ error: 'Sucursal no encontrada' });
            }
            res.json(branch);
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    });

    return router;
}
