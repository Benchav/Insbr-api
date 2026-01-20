import { Branch, CreateBranchDto, UpdateBranchDto } from '../../../core/entities/branch.entity.js';
import { IBranchRepository } from '../../../core/interfaces/branch.repository.js';
import { storage } from '../storage.js';

export class BranchRepositoryImpl implements IBranchRepository {
    async findById(id: string): Promise<Branch | null> {
        return storage.branches.get(id) || null;
    }

    async findAll(filters?: { isActive?: boolean }): Promise<Branch[]> {
        let branches = Array.from(storage.branches.values());

        if (filters?.isActive !== undefined) {
            branches = branches.filter(b => b.isActive === filters.isActive);
        }

        return branches;
    }

    async findByCode(code: string): Promise<Branch | null> {
        const branches = Array.from(storage.branches.values());
        return branches.find(b => b.code === code) || null;
    }

    async create(data: CreateBranchDto): Promise<Branch> {
        const id = `BRANCH-${data.code.toUpperCase()}-${Date.now()}`;
        const branch: Branch = {
            id,
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        storage.branches.set(id, branch);
        return branch;
    }

    async update(id: string, data: UpdateBranchDto): Promise<Branch> {
        const branch = await this.findById(id);
        if (!branch) {
            throw new Error('Sucursal no encontrada');
        }

        const updated: Branch = {
            ...branch,
            ...data,
            updatedAt: new Date()
        };

        storage.branches.set(id, updated);
        return updated;
    }

    async delete(id: string): Promise<void> {
        const branch = await this.findById(id);
        if (!branch) {
            throw new Error('Sucursal no encontrada');
        }
        storage.branches.delete(id);
    }
}
