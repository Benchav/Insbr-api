-- ============================================
-- SCHEMA SQL PARA TURSO (SQLite)
-- ERP Insumos - Sistema de Distribución
-- ============================================

-- ============================================
-- TABLA: branches (Sucursales)
-- ============================================
CREATE TABLE IF NOT EXISTS branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    address TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_branches_code ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

-- ============================================
-- TABLA: users (Usuarios)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('ADMIN', 'SELLER')),
    branch_id TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_branch_id ON users(branch_id);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- ============================================
-- TABLA: products (Productos)
-- ============================================
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    sku TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    cost_price INTEGER NOT NULL,
    retail_price INTEGER NOT NULL,
    wholesale_price INTEGER NOT NULL,
    unit TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- ============================================
-- TABLA: stock (Inventario)
-- ============================================
CREATE TABLE IF NOT EXISTS stock (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    branch_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    min_stock INTEGER NOT NULL DEFAULT 10,
    max_stock INTEGER NOT NULL DEFAULT 1000,
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    UNIQUE(product_id, branch_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_product_id ON stock(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_branch_id ON stock(branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_product_branch ON stock(product_id, branch_id);

-- ============================================
-- TABLA: customers (Clientes)
-- ============================================
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    tax_id TEXT,
    credit_limit INTEGER NOT NULL DEFAULT 0,
    current_debt INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL CHECK(type IN ('RETAIL', 'WHOLESALE')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

-- ============================================
-- TABLA: suppliers (Proveedores)
-- ============================================
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT NOT NULL,
    tax_id TEXT,
    credit_days INTEGER NOT NULL DEFAULT 30,
    credit_limit INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

-- ============================================
-- TABLA: sales (Ventas)
-- ============================================
CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    customer_id TEXT,
    subtotal INTEGER NOT NULL,
    tax INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('CASH', 'CREDIT')),
    payment_method TEXT CHECK(payment_method IN ('CASH', 'TRANSFER', 'CHECK')),
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_sales_branch_id ON sales(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_type ON sales(type);

-- ============================================
-- TABLA: sale_items (Items de Venta)
-- ============================================
CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- ============================================
-- TABLA: purchases (Compras)
-- ============================================
CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    supplier_id TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    tax INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('CASH', 'CREDIT')),
    payment_method TEXT CHECK(payment_method IN ('CASH', 'TRANSFER', 'CHECK')),
    invoice_number TEXT,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_branch_id ON purchases(branch_id);
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_created_at ON purchases(created_at);
CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(type);

-- ============================================
-- TABLA: purchase_items (Items de Compra)
-- ============================================
CREATE TABLE IF NOT EXISTS purchase_items (
    id TEXT PRIMARY KEY,
    purchase_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_cost INTEGER NOT NULL,
    subtotal INTEGER NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_id ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product_id ON purchase_items(product_id);

-- ============================================
-- TABLA: credit_accounts (Cuentas de Crédito)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_accounts (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL CHECK(type IN ('CPP', 'CXC')),
    branch_id TEXT NOT NULL,
    supplier_id TEXT,
    customer_id TEXT,
    purchase_id TEXT,
    sale_id TEXT,
    total_amount INTEGER NOT NULL,
    paid_amount INTEGER NOT NULL DEFAULT 0,
    balance_amount INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('PENDIENTE', 'PAGADO_PARCIAL', 'PAGADO')),
    due_date TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id)
);

CREATE INDEX IF NOT EXISTS idx_credit_accounts_type ON credit_accounts(type);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_branch_id ON credit_accounts(branch_id);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_status ON credit_accounts(status);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_customer_id ON credit_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_credit_accounts_supplier_id ON credit_accounts(supplier_id);

-- ============================================
-- TABLA: credit_payments (Pagos de Crédito)
-- ============================================
CREATE TABLE IF NOT EXISTS credit_payments (
    id TEXT PRIMARY KEY,
    credit_account_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'TRANSFER', 'CHECK')),
    reference TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (credit_account_id) REFERENCES credit_accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_credit_payments_credit_account_id ON credit_payments(credit_account_id);
CREATE INDEX IF NOT EXISTS idx_credit_payments_created_at ON credit_payments(created_at);

-- ============================================
-- TABLA: cash_movements (Movimientos de Caja)
-- ============================================
CREATE TABLE IF NOT EXISTS cash_movements (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
    category TEXT NOT NULL CHECK(category IN ('SALE', 'PURCHASE', 'CREDIT_PAYMENT', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT')),
    amount INTEGER NOT NULL,
    sale_id TEXT,
    purchase_id TEXT,
    credit_account_id TEXT,
    payment_method TEXT NOT NULL CHECK(payment_method IN ('CASH', 'TRANSFER', 'CHECK')),
    reference TEXT,
    description TEXT NOT NULL,
    notes TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (branch_id) REFERENCES branches(id),
    FOREIGN KEY (sale_id) REFERENCES sales(id),
    FOREIGN KEY (purchase_id) REFERENCES purchases(id),
    FOREIGN KEY (credit_account_id) REFERENCES credit_accounts(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_branch_id ON cash_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_category ON cash_movements(category);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON cash_movements(created_at);

-- ============================================
-- TABLA: transfers (Transferencias)
-- ============================================
CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    from_branch_id TEXT NOT NULL,
    to_branch_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('PENDING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED')),
    notes TEXT,
    created_by TEXT NOT NULL,
    approved_by TEXT,
    completed_by TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    approved_at TEXT,
    completed_at TEXT,
    FOREIGN KEY (from_branch_id) REFERENCES branches(id),
    FOREIGN KEY (to_branch_id) REFERENCES branches(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    FOREIGN KEY (approved_by) REFERENCES users(id),
    FOREIGN KEY (completed_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_transfers_from_branch_id ON transfers(from_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_to_branch_id ON transfers(to_branch_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at);

-- ============================================
-- TABLA: transfer_items (Items de Transferencia)
-- ============================================
CREATE TABLE IF NOT EXISTS transfer_items (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    FOREIGN KEY (transfer_id) REFERENCES transfers(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_items_transfer_id ON transfer_items(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_items_product_id ON transfer_items(product_id);
