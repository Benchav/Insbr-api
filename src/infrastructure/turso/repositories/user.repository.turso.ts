import { tursoClient } from '../client.js';
import { UserRepository } from '../../../core/interfaces/user.repository.js';
import { User } from '../../../core/entities/user.entity.js';

export class UserRepositoryTurso implements UserRepository {
    async create(user: User): Promise<User> {
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `INSERT INTO users (id, username, password, name, role, branch_id, is_active, created_at, updated_at)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [user.id, user.username, user.password, user.name, user.role, user.branchId, user.isActive ? 1 : 0, now, now]
        });

        return user;
    }

    async findById(id: string): Promise<User | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM users WHERE id = ?',
            args: [id]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToUser(result.rows[0]);
    }

    async findByUsername(username: string): Promise<User | null> {
        const result = await tursoClient.execute({
            sql: 'SELECT * FROM users WHERE username = ?',
            args: [username]
        });

        if (result.rows.length === 0) return null;

        return this.mapRowToUser(result.rows[0]);
    }

    async findAll(): Promise<User[]> {
        const result = await tursoClient.execute('SELECT * FROM users ORDER BY created_at DESC');
        return result.rows.map(row => this.mapRowToUser(row));
    }

    async update(user: User): Promise<User> {
        const now = new Date().toISOString();

        await tursoClient.execute({
            sql: `UPDATE users SET username = ?, password = ?, name = ?, role = ?, branch_id = ?, is_active = ?, updated_at = ? WHERE id = ?`,
            args: [user.username, user.password, user.name, user.role, user.branchId, user.isActive ? 1 : 0, now, user.id]
        });

        return user;
    }

    private mapRowToUser(row: any): User {
        return {
            id: row.id as string,
            username: row.username as string,
            password: row.password as string,
            name: row.name as string,
            role: row.role as 'ADMIN' | 'SELLER',
            branchId: row.branch_id as string,
            isActive: Boolean(row.is_active),
            createdAt: new Date(row.created_at as string),
            updatedAt: new Date(row.updated_at as string)
        };
    }
}
