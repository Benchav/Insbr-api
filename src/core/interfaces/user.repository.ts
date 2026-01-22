import { User } from '../entities/user.entity.js';

/**
 * Repositorio de Usuarios
 */
export interface UserRepository {
    findById(id: string): Promise<User | null>;
    findByUsername(username: string): Promise<User | null>;
    create(user: User): Promise<User>;
    update(user: User): Promise<User>;
    findAll(): Promise<User[]>;
    delete(id: string): Promise<void>;
}
