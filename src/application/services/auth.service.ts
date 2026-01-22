import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../../core/interfaces/user.repository.js';
import { User } from '../../core/entities/user.entity.js';
import { getNicaraguaNow } from '../../core/utils/date.utils.js';

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
        role: 'ADMIN' | 'GERENTE' | 'CAJERO';
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
            createdAt: getNicaraguaNow(),
            updatedAt: getNicaraguaNow()
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

    /**
     * Listar todos los usuarios (solo ADMIN)
     */
    async getAllUsers(): Promise<Omit<User, 'password'>[]> {
        const users = await this.userRepository.findAll();

        // Remover passwords de todos los usuarios
        return users.map(user => {
            const { password: _, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });
    }


    /**
     * Update User - Actualiza información del usuario (ADMIN)
     */
    async updateUser(id: string, updates: {
        username?: string;
        password?: string;
        name?: string;
        role?: 'ADMIN' | 'GERENTE' | 'CAJERO';
        branchId?: string;
        isActive?: boolean;
    }): Promise<Omit<User, 'password'>> {
        // 1. Verificar si el usuario existe
        const user = await this.userRepository.findById(id);
        if (!user) {
            throw new Error('Usuario no encontrado');
        }

        // 2. Si se cambia el username, verificar duplicados
        if (updates.username && updates.username !== user.username) {
            const existingUser = await this.userRepository.findByUsername(updates.username);
            if (existingUser) {
                throw new Error('El nombre de usuario ya está en uso');
            }
            user.username = updates.username;
        }

        // 3. Actualizar campos simples
        if (updates.name) user.name = updates.name;
        if (updates.role) user.role = updates.role;
        if (updates.branchId) user.branchId = updates.branchId;
        if (updates.isActive !== undefined) user.isActive = updates.isActive;

        // 4. Si se cambia password, hashear
        if (updates.password) {
            user.password = await bcrypt.hash(updates.password, 10);
        }

        user.updatedAt = getNicaraguaNow();

        // 5. Guardar cambios
        const updatedUser = await this.userRepository.update(user);

        // Retornar sin password
        const { password: _, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }
}
