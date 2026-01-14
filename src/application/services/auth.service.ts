import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../core/interfaces/user.repository.js';
import { User } from '../../core/entities/user.entity.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-12345';
const JWT_EXPIRATION = '8h';

/**
 * Servicio de Autenticación
 * Maneja login, registro y gestión de usuarios
 */
export class AuthService {
    constructor(private userRepository: UserRepository) { }

    /**
     * Login - Valida credenciales y genera JWT
     */
    async login(username: string, password: string): Promise<{ token: string; user: Omit<User, 'password'> }> {
        // Buscar usuario por username
        const user = await this.userRepository.findByUsername(username);

        if (!user) {
            throw new Error('Credenciales inválidas');
        }

        if (!user.isActive) {
            throw new Error('Usuario inactivo');
        }

        // Validar password con bcrypt
        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new Error('Credenciales inválidas');
        }

        // Generar JWT
        const tokenPayload = {
            userId: user.id,
            username: user.username,
            name: user.name,
            role: user.role,
            branchId: user.branchId
        };

        const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRATION });

        // Retornar token y usuario (sin password)
        const { password: _, ...userWithoutPassword } = user;

        return {
            token,
            user: userWithoutPassword
        };
    }

    /**
     * Register - Crea un nuevo usuario (solo ADMIN puede hacer esto)
     */
    async register(userData: {
        username: string;
        password: string;
        name: string;
        role: 'ADMIN' | 'SELLER';
        branchId: string;
    }): Promise<Omit<User, 'password'>> {
        // Verificar si el username ya existe
        const existingUser = await this.userRepository.findByUsername(userData.username);

        if (existingUser) {
            throw new Error('El nombre de usuario ya existe');
        }

        // Hashear password
        const passwordHash = await bcrypt.hash(userData.password, 10);

        // Crear usuario
        const newUser: User = {
            id: `USER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            username: userData.username,
            password: passwordHash,
            name: userData.name,
            role: userData.role,
            branchId: userData.branchId,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const createdUser = await this.userRepository.create(newUser);

        // Retornar sin password
        const { password: _, ...userWithoutPassword } = createdUser;
        return userWithoutPassword;
    }

    /**
     * Obtener usuario por ID
     */
    async getUserById(id: string): Promise<Omit<User, 'password'> | null> {
        const user = await this.userRepository.findById(id);

        if (!user) {
            return null;
        }

        const { password: _, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
}
