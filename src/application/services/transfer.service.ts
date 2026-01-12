import { ITransferRepository } from '../../core/interfaces/transfer.repository.js';
import { IStockRepository } from '../../core/interfaces/stock.repository.js';
import { IBranchRepository } from '../../core/interfaces/branch.repository.js';
import { IProductRepository } from '../../core/interfaces/product.repository.js';
import { CreateTransferDto, Transfer } from '../../core/entities/transfer.entity.js';

export class TransferService {
    constructor(
        private transferRepository: ITransferRepository,
        private stockRepository: IStockRepository,
        private branchRepository: IBranchRepository,
        private productRepository: IProductRepository
    ) { }

    async createTransfer(data: CreateTransferDto): Promise<Transfer> {
        // 1. Validar que las sucursales existan y sean diferentes
        if (data.fromBranchId === data.toBranchId) {
            throw new Error('La sucursal de origen y destino deben ser diferentes');
        }

        const fromBranch = await this.branchRepository.findById(data.fromBranchId);
        const toBranch = await this.branchRepository.findById(data.toBranchId);

        if (!fromBranch || !toBranch) {
            throw new Error('Sucursal no encontrada');
        }

        // 2. Validar stock disponible en sucursal de origen
        for (const item of data.items) {
            const stock = await this.stockRepository.findByProductAndBranch(
                item.productId,
                data.fromBranchId
            );

            if (!stock || stock.quantity < item.quantity) {
                const product = await this.productRepository.findById(item.productId);
                throw new Error(
                    `Stock insuficiente en ${fromBranch.name} para ${product?.name || item.productId}. ` +
                    `Disponible: ${stock?.quantity || 0}, Requerido: ${item.quantity}`
                );
            }
        }

        // 3. Crear la transferencia
        const transfer = await this.transferRepository.create(data);

        return transfer;
    }

    async approveTransfer(transferId: string, userId: string): Promise<Transfer> {
        const transfer = await this.transferRepository.findById(transferId);
        if (!transfer) {
            throw new Error('Transferencia no encontrada');
        }

        if (transfer.status !== 'PENDING') {
            throw new Error('Solo se pueden aprobar transferencias pendientes');
        }

        // Actualizar estado a EN_TRANSITO
        return this.transferRepository.update(transferId, {
            status: 'IN_TRANSIT',
            approvedBy: userId,
            approvedAt: new Date()
        });
    }

    async completeTransfer(transferId: string, userId: string): Promise<Transfer> {
        const transfer = await this.transferRepository.findById(transferId);
        if (!transfer) {
            throw new Error('Transferencia no encontrada');
        }

        if (transfer.status !== 'IN_TRANSIT') {
            throw new Error('Solo se pueden completar transferencias en tránsito');
        }

        // 1. Descontar stock de sucursal origen
        for (const item of transfer.items) {
            const fromStock = await this.stockRepository.findByProductAndBranch(
                item.productId,
                transfer.fromBranchId
            );

            if (fromStock) {
                await this.stockRepository.updateQuantity(
                    fromStock.id,
                    fromStock.quantity - item.quantity
                );
            }
        }

        // 2. Incrementar stock en sucursal destino
        for (const item of transfer.items) {
            const toStock = await this.stockRepository.findByProductAndBranch(
                item.productId,
                transfer.toBranchId
            );

            if (toStock) {
                await this.stockRepository.updateQuantity(
                    toStock.id,
                    toStock.quantity + item.quantity
                );
            } else {
                // Crear nuevo registro de stock
                await this.stockRepository.create({
                    productId: item.productId,
                    branchId: transfer.toBranchId,
                    quantity: item.quantity,
                    minStock: 10,
                    maxStock: 1000
                });
            }
        }

        // 3. Actualizar estado de la transferencia
        return this.transferRepository.update(transferId, {
            status: 'COMPLETED',
            completedBy: userId,
            completedAt: new Date()
        });
    }

    async cancelTransfer(transferId: string): Promise<Transfer> {
        const transfer = await this.transferRepository.findById(transferId);
        if (!transfer) {
            throw new Error('Transferencia no encontrada');
        }

        if (transfer.status === 'COMPLETED') {
            throw new Error('No se pueden cancelar transferencias completadas');
        }

        return this.transferRepository.update(transferId, {
            status: 'CANCELLED'
        });
    }

    async getTransfer(id: string): Promise<Transfer> {
        const transfer = await this.transferRepository.findById(id);
        if (!transfer) {
            throw new Error('Transferencia no encontrada');
        }
        return transfer;
    }

    async listTransfersByBranch(
        branchId: string,
        filters?: { status?: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'; direction?: 'FROM' | 'TO' }
    ): Promise<Transfer[]> {
        return this.transferRepository.findByBranch(branchId, filters);
    }
}
