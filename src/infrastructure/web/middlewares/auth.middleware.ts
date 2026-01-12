import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                branchId: string;
                role: string;
                name: string;
            }
        }
    }
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-12345';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Token requerido' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

export const loginController = (req: Request, res: Response) => {
    const { username, password } = req.body;
    let user;

    // Usuarios Mock vinculados a los IDs estáticos del Seed
    if (username === 'admin_diriamba' && password === '123') {
        user = { userId: 'USER-DIR-ADMIN', name: 'Admin Diriamba', role: 'ADMIN', branchId: 'BRANCH-DIR-001' };
    } else if (username === 'admin_jinotepe' && password === '123') {
        user = { userId: 'USER-JIN-ADMIN', name: 'Admin Jinotepe', role: 'ADMIN', branchId: 'BRANCH-JIN-001' };
    } else {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '8h' });
    res.json({ message: 'Login exitoso', token, user });
};
