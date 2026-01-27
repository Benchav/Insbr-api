import { ITransferRepository } from '../../core/interfaces/transfer.repository.js';
import { IStockRepository } from '../../core/interfaces/stock.repository.js';
import { IBranchRepository } from '../../core/interfaces/branch.repository.js';
import { IProductRepository } from '../../core/interfaces/product.repository.js';
import { CreateTransferDto, Transfer, TransferStatus } from '../../core/entities/transfer.entity.js';
import { getNicaraguaNow } from '../../core/utils/date.utils.js';

export class TransferService {
    constructor(
        private transferRepository: ITransferRepository,
        private stockRepository: IStockRepository,
        private branchRepository: IBranchRepository,
        private productRepository: IProductRepository
    ) { }


    /**
     * Crea una transferencia tipo SEND o REQUEST.
     * - SEND: Sucursal origen envía stock (estado inicial: PENDING, valida stock pero no descuenta)
     * - REQUEST: Sucursal destino solicita stock (estado inicial: REQUESTED, no afecta stock)
     */
    async createTransfer(data: CreateTransferDto & { userId: string }): Promise<Transfer> {
        if (data.fromBranchId === data.toBranchId) {
            throw new Error('La sucursal de origen y destino deben ser diferentes');
        }
        const fromBranch = await this.branchRepository.findById(data.fromBranchId);
        const toBranch = await this.branchRepository.findById(data.toBranchId);
        if (!fromBranch || !toBranch) {
            throw new Error('Sucursal no encontrada');
        }
        // Determinar tipo: si el usuario es de la sucursal origen, es SEND; si es de destino, es REQUEST
        let type: 'SEND' | 'REQUEST' = 'SEND';
        if (data.userId === data.toBranchId) {
            type = 'REQUEST';
        }
        const status = (type === 'SEND' ? 'PENDING' : 'REQUESTED') as TransferStatus;
        // Si es SEND, validar stock pero NO descontar
        if (type === 'SEND') {
            for (const item of data.items) {
                const stock = await this.stockRepository.findByProductAndBranch(item.productId, data.fromBranchId);
                if (!stock || stock.quantity < item.quantity) {
                    throw new Error(`Stock insuficiente en ${fromBranch.name} para producto ${item.productId}`);
                }
            }
        }
        // Crear transferencia
        return await this.transferRepository.create({
            ...data,
            type,
            status,
        } as any);
    }


    /**
     * Paso 2: Aceptar una solicitud de transferencia (REQUEST)
     * Solo válido para tipo REQUEST en estado REQUESTED
     * Valida stock en origen, cambia a PENDING, registra approvedBy/approvedAt
     */
    async acceptRequest(transferId: string, userId: string): Promise<Transfer> {
        const transfer = await this.transferRepository.findById(transferId);
        if (!transfer) throw new Error('Transferencia no encontrada');
        if (transfer.type !== 'REQUEST' || transfer.status !== 'REQUESTED') {
            throw new Error('Solo se pueden aceptar solicitudes tipo REQUEST en estado REQUESTED');
        }
        // Validar stock en origen
        for (const item of transfer.items) {
            const stock = await this.stockRepository.findByProductAndBranch(item.productId, transfer.fromBranchId);
            if (!stock || stock.quantity < item.quantity) {
                throw new Error(`Stock insuficiente en sucursal origen para producto ${item.productId}`);
            }
        }
        return this.transferRepository.update(transferId, {
            status: 'PENDING',
            approvedBy: userId,
            approvedAt: getNicaraguaNow()
        });
    }


    /**
     * Paso 3: Despachar transferencia (SHIP)
     * Cambia a IN_TRANSIT y descuenta stock de origen. Registra shippedBy/shippedAt
     */
    async shipTransfer(transferId: string, userId: string): Promise<Transfer> {
        const transfer = await this.transferRepository.findById(transferId);
        if (!transfer) throw new Error('Transferencia no encontrada');
        if (transfer.status !== 'PENDING') throw new Error('Solo se pueden despachar transferencias en estado PENDING');
        // Descontar stock de origen (transaccional)
        for (const item of transfer.items) {
            const fromStock = await this.stockRepository.findByProductAndBranch(item.productId, transfer.fromBranchId);
            if (!fromStock || fromStock.quantity < item.quantity) {
                throw new Error(`Stock insuficiente en sucursal origen para producto ${item.productId}`);
            }
            await this.stockRepository.updateQuantity(fromStock.id, fromStock.quantity - item.quantity);
        }
        return this.transferRepository.update(transferId, {
            status: 'IN_TRANSIT',
            shippedBy: userId,
            shippedAt: getNicaraguaNow()
        });
    }

    /**
     * Paso 4: Recibir transferencia (RECEIVE)
     * Cambia a COMPLETED y suma stock en destino. Registra completedBy/completedAt
     */
    async receiveTransfer(transferId: string, userId: string): Promise<Transfer> {
        const transfer = await this.transferRepository.findById(transferId);
        if (!transfer) throw new Error('Transferencia no encontrada');
        if (transfer.status !== 'IN_TRANSIT') throw new Error('Solo se pueden recibir transferencias en tránsito');
        // Sumar stock en destino (transaccional)
        for (const item of transfer.items) {
            const toStock = await this.stockRepository.findByProductAndBranch(item.productId, transfer.toBranchId);
            if (toStock) {
                await this.stockRepository.updateQuantity(toStock.id, toStock.quantity + item.quantity);
            } else {
                await this.stockRepository.create({
                    productId: item.productId,
                    branchId: transfer.toBranchId,
                    quantity: item.quantity,
                    minStock: 10,
                    maxStock: 1000
                });
            }
        }
        return this.transferRepository.update(transferId, {
            status: 'COMPLETED',
            completedBy: userId,
            completedAt: getNicaraguaNow()
        });
    }

    async cancelTransfer(transferId: string, userId: string): Promise<Transfer> {
        const transfer = await this.transferRepository.findById(transferId);
        if (!transfer) throw new Error('Transferencia no encontrada');
        if (transfer.status === 'COMPLETED') throw new Error('No se pueden cancelar transferencias completadas');
        // Opcional: podrías registrar quién canceló y cuándo
        return this.transferRepository.update(transferId, {
            status: 'CANCELLED'
        });
    }


    async getTransfer(id: string): Promise<Transfer> {
        const transfer = await this.transferRepository.findById(id);
        if (!transfer) throw new Error('Transferencia no encontrada');
        return transfer;
    }

    async listTransfersByBranch(
        branchId: string,
        filters?: { status?: TransferStatus; direction?: 'FROM' | 'TO' }
    ): Promise<Transfer[]> {
        return this.transferRepository.findByBranch(branchId, filters);
    }
}
