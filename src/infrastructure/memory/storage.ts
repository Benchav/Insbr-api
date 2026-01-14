import { Product } from '../../core/entities/product.entity.js';
import { Branch } from '../../core/entities/branch.entity.js';
import { Supplier } from '../../core/entities/supplier.entity.js';
import { Customer } from '../../core/entities/customer.entity.js';
import { Stock } from '../../core/entities/stock.entity.js';
import { CreditAccount, CreditPayment } from '../../core/entities/credit-account.entity.js';
import { Sale } from '../../core/entities/sale.entity.js';
import { Purchase } from '../../core/entities/purchase.entity.js';
import { CashMovement } from '../../core/entities/cash-movement.entity.js';
import { Transfer } from '../../core/entities/transfer.entity.js';
import { User } from '../../core/entities/user.entity.js';

/**
 * Almacenamiento en memoria usando Maps
 */
export class MemoryStorage {
    // Catálogo compartido
    public products = new Map<string, Product>();
    public branches = new Map<string, Branch>();
    public suppliers = new Map<string, Supplier>();
    public customers = new Map<string, Customer>();
    public users = new Map<string, User>();

    // Datos por sucursal
    public stock = new Map<string, Stock>();
    public sales = new Map<string, Sale>();
    public purchases = new Map<string, Purchase>();
    public cashMovements = new Map<string, CashMovement>();
    public transfers = new Map<string, Transfer>();

    // Créditos
    public creditAccounts = new Map<string, CreditAccount>();
    public creditPayments = new Map<string, CreditPayment>();

    // Método para limpiar todo (útil para testing)
    public clear(): void {
        this.products.clear();
        this.branches.clear();
        this.suppliers.clear();
        this.customers.clear();
        this.users.clear();
        this.stock.clear();
        this.sales.clear();
        this.purchases.clear();
        this.cashMovements.clear();
        this.transfers.clear();
        this.creditAccounts.clear();
        this.creditPayments.clear();
    }
}

// Instancia singleton del storage
export const storage = new MemoryStorage();
