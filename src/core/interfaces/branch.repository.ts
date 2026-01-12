import { Branch, CreateBranchDto, UpdateBranchDto } from '../entities/branch.entity.js';

export interface IBranchRepository {
    create(data: CreateBranchDto): Promise<Branch>;
    findById(id: string): Promise<Branch | null>;
    findByCode(code: string): Promise<Branch | null>;
    findAll(filters?: { isActive?: boolean }): Promise<Branch[]>;
    update(id: string, data: UpdateBranchDto): Promise<Branch>;
    delete(id: string): Promise<void>;
}
