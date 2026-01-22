import { User } from '../../../core/entities/user.entity.js';
import { UserRepository } from '../../../core/interfaces/user.repository.js';
import { storage } from '../storage.js';

/**
 * Implementación en memoria del repositorio de usuarios
 */
export class UserRepositoryImpl implements UserRepository {
    async findById(id: string): Promise<User | null> {
        return storage.users.get(id) || null;
    }

    async findByUsername(username: string): Promise<User | null> {
        const users = Array.from(storage.users.values());
        return users.find(u => u.username === username) || null;
    }

    async create(user: User): Promise<User> {
        storage.users.set(user.id, user);
        return user;
    }

    async update(user: User): Promise<User> {
        storage.users.set(user.id, user);
        return user;
    }

    async findAll(): Promise<User[]> {
        return Array.from(storage.users.values());
    }

    async delete(id: string): Promise<void> {
        storage.users.delete(id);
    }
}
