import { IStockRepository } from '../../core/interfaces/stock.repository.js';
import { IProductRepository } from '../../core/interfaces/product.repository.js';
import { Stock } from '../../core/entities/stock.entity.js';
import { Product } from '../../core/entities/product.entity.js';

export interface StockWithProduct extends Stock {
    product: Product;
}

export interface StockAlert {
    stock: Stock;
    product: Product;
    currentQuantity: number;
    minStock: number;
    deficit: number;
}

/**
 * Servicio para gestión de inventario y stock
 */
export class StockService {
    constructor(
        private stockRepository: IStockRepository,
        private productRepository: IProductRepository
    ) { }

    /**
     * Obtiene todo el stock de una sucursal con información del producto
     */
    async getStockByBranch(branchId: string): Promise<StockWithProduct[]> {
        const stocks = await this.stockRepository.findByBranch(branchId);
        const stocksWithProduct: StockWithProduct[] = [];

        for (const stock of stocks) {
            const product = await this.productRepository.findById(stock.productId);
            if (product) {
                stocksWithProduct.push({
                    ...stock,
                    product
                });
            }
        }

        return stocksWithProduct;
    }

    /**
     * Obtiene el stock de un producto en todas las sucursales
     */
    async getStockByProduct(productId: string): Promise<Stock[]> {
        return this.stockRepository.findByProduct(productId);
    }

    /**
     * Obtiene alertas de productos con stock bajo
     */
    async getLowStockAlerts(branchId: string): Promise<StockAlert[]> {
        const stocks = await this.stockRepository.findByBranch(branchId);
        const alerts: StockAlert[] = [];

        for (const stock of stocks) {
            if (stock.quantity <= stock.minStock) {
                const product = await this.productRepository.findById(stock.productId);
                if (product) {
                    alerts.push({
                        stock,
                        product,
                        currentQuantity: stock.quantity,
                        minStock: stock.minStock,
                        deficit: stock.minStock - stock.quantity
                    });
                }
            }
        }

        return alerts;
    }

    /**
     * Ajusta el stock de un producto (para correcciones, mermas, etc.)
     */
    async adjustStock(
        stockId: string,
        newQuantity: number,
        reason: string,
        userId: string
    ): Promise<Stock> {
        // Validar que la nueva cantidad sea válida
        if (newQuantity < 0) {
            throw new Error('La cantidad no puede ser negativa');
        }

        // Validar que tenga una razón
        if (!reason || reason.trim() === '') {
            throw new Error('Debe proporcionar una razón para el ajuste');
        }

        const stock = await this.stockRepository.findById(stockId);
        if (!stock) {
            throw new Error('Stock no encontrado');
        }

        const previousQuantity = stock.quantity;
        const difference = newQuantity - previousQuantity;

        // Actualizar la cantidad
        const updatedStock = await this.stockRepository.updateQuantity(stockId, newQuantity);

        // TODO: Registrar el ajuste en un log de auditoría
        console.log(`[STOCK ADJUSTMENT] User ${userId}: ${stock.productId} adjusted from ${previousQuantity} to ${newQuantity}. Reason: ${reason}`);

        return updatedStock;
    }

    /**
     * Obtiene el stock de un producto específico en una sucursal
     */
    async getStockByProductAndBranch(productId: string, branchId: string): Promise<Stock | null> {
        return this.stockRepository.findByProductAndBranch(productId, branchId);
    }

    /**
     * Verifica si hay stock suficiente para una cantidad solicitada
     */
    async hasEnoughStock(productId: string, branchId: string, requiredQuantity: number): Promise<boolean> {
        const stock = await this.getStockByProductAndBranch(productId, branchId);
        if (!stock) {
            return false;
        }
        return stock.quantity >= requiredQuantity;
    }

    /**
     * Obtiene el total de unidades en stock de todos los productos en una sucursal
     */
    async getTotalUnits(branchId: string): Promise<number> {
        const stocks = await this.stockRepository.findByBranch(branchId);
        return stocks.reduce((total, stock) => total + stock.quantity, 0);
    }

    /**
     * Obtiene el valor total del inventario en una sucursal (usando precio de costo)
     */
    async getInventoryValue(branchId: string): Promise<number> {
        const stocksWithProduct = await this.getStockByBranch(branchId);
        let totalValue = 0;

        for (const item of stocksWithProduct) {
            totalValue += item.quantity * item.product.costPrice;
        }

        return totalValue;
    }
}
