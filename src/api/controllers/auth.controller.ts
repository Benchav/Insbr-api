import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { AuthService } from '../../application/services/auth.service.js';
import { authenticate, authorize } from '../../infrastructure/web/middlewares/auth.middleware.js';

/**
 * Esquemas de validación con Zod
 */
const loginSchema = z.object({
    username: z.string().min(3, 'El username debe tener al menos 3 caracteres'),
    password: z.string().min(3, 'El password debe tener al menos 3 caracteres')
});

const registerSchema = z.object({
    username: z.string().min(3, 'El username debe tener al menos 3 caracteres'),
    password: z.string().min(3, 'El password debe tener al menos 3 caracteres'),
    name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
    role: z.enum(['ADMIN', 'SELLER']),
    branchId: z.string().min(1, 'El branchId es requerido')
});

/**
 * Controlador de Autenticación
 */
export function createAuthController(authService: AuthService): Router {
    const router = Router();

    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: Login de usuario
     *     tags: [Auth]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - username
     *               - password
     *             properties:
     *               username:
     *                 type: string
     *                 example: admin_diriamba
     *               password:
     *                 type: string
     *                 example: "123"
     *     responses:
     *       200:
     *         description: Login exitoso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 token:
     *                   type: string
     *                 user:
     *                   type: object
     *       401:
     *         description: Credenciales inválidas
     *       500:
     *         description: Error del servidor
     */
    router.post('/login', async (req: Request, res: Response) => {
        try {
            const { username, password } = loginSchema.parse(req.body);

            const result = await authService.login(username, password);

            res.json({
                message: 'Login exitoso',
                token: result.token,
                user: result.user
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
                return;
            }

            if (error.message === 'Credenciales inválidas' || error.message === 'Usuario inactivo') {
                res.status(401).json({ error: error.message });
                return;
            }

            console.error('Error en login:', error);
            res.status(500).json({ error: 'Error al procesar login' });
        }
    });

    /**
     * @swagger
     * /api/auth/register:
     *   post:
     *     summary: Registrar nuevo usuario (Solo ADMIN)
     *     tags: [Auth]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - username
     *               - password
     *               - name
     *               - role
     *               - branchId
     *             properties:
     *               username:
     *                 type: string
     *                 example: vendedor1
     *               password:
     *                 type: string
     *                 example: "123"
     *               name:
     *                 type: string
     *                 example: Juan Pérez
     *               role:
     *                 type: string
     *                 enum: [ADMIN, SELLER]
     *                 example: SELLER
     *               branchId:
     *                 type: string
     *                 example: BRANCH-DIR-001
     *     responses:
     *       201:
     *         description: Usuario creado exitosamente
     *       400:
     *         description: Datos inválidos
     *       401:
     *         description: No autenticado
     *       403:
     *         description: No autorizado (solo ADMIN)
     *       500:
     *         description: Error del servidor
     */
    router.post('/register', authenticate, authorize(['ADMIN']), async (req: Request, res: Response) => {
        try {
            const userData = registerSchema.parse(req.body);

            const newUser = await authService.register(userData);

            res.status(201).json({
                message: 'Usuario creado exitosamente',
                user: newUser
            });
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                res.status(400).json({ error: error.issues });
                return;
            }

            if (error.message === 'El nombre de usuario ya existe') {
                res.status(400).json({ error: error.message });
                return;
            }

            console.error('Error en register:', error);
            res.status(500).json({ error: 'Error al crear usuario' });
        }
    });

    /**
     * @swagger
     * /api/auth/me:
     *   get:
     *     summary: Obtener información del usuario actual
     *     tags: [Auth]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Información del usuario
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 user:
     *                   type: object
     *       401:
     *         description: No autenticado
     *       404:
     *         description: Usuario no encontrado
     *       500:
     *         description: Error del servidor
     */
    router.get('/me', authenticate, async (req: Request, res: Response) => {
        try {
            if (!req.user) {
                res.status(401).json({ error: 'No autenticado' });
                return;
            }

            const user = await authService.getUserById(req.user.userId);

            if (!user) {
                res.status(404).json({ error: 'Usuario no encontrado' });
                return;
            }

            res.json({ user });
        } catch (error: any) {
            console.error('Error en /me:', error);
            res.status(500).json({ error: 'Error al obtener información del usuario' });
        }
    });

    return router;
}
