-- Migración para agregar campo status a sales y categoría REFUND a cash_movements
-- Ejecutar este script para actualizar la base de datos existente

-- 1. Agregar columna status a la tabla sales (si no existe)
-- SQLite no soporta ALTER COLUMN, así que verificamos si ya existe
-- Si la columna no existe, la agregamos con valor por defecto 'ACTIVE'

-- Nota: En SQLite, ALTER TABLE ADD COLUMN solo funciona si la columna no existe
-- Si ya existe, el comando fallará pero no afectará los datos

-- Agregar columna status a sales
ALTER TABLE sales ADD COLUMN status TEXT CHECK(status IN ('ACTIVE', 'CANCELLED')) DEFAULT 'ACTIVE';

-- Actualizar todas las ventas existentes para que tengan status 'ACTIVE'
UPDATE sales SET status = 'ACTIVE' WHERE status IS NULL;

-- Nota: Para la categoría REFUND en cash_movements, necesitamos recrear la tabla
-- porque SQLite no permite modificar constraints CHECK existentes

-- Crear tabla temporal con la nueva definición
CREATE TABLE IF NOT EXISTS cash_movements_new (
    id TEXT PRIMARY KEY,
    branch_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('INCOME', 'EXPENSE')),
    category TEXT NOT NULL CHECK(category IN ('SALE', 'PURCHASE', 'CREDIT_PAYMENT', 'EXPENSE', 'TRANSFER', 'REFUND', 'ADJUSTMENT')),
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

-- Copiar datos de la tabla original a la nueva
INSERT INTO cash_movements_new 
SELECT * FROM cash_movements;

-- Eliminar tabla original
DROP TABLE cash_movements;

-- Renombrar tabla nueva
ALTER TABLE cash_movements_new RENAME TO cash_movements;

-- Recrear índices
CREATE INDEX IF NOT EXISTS idx_cash_movements_branch_id ON cash_movements(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(type);
CREATE INDEX IF NOT EXISTS idx_cash_movements_category ON cash_movements(category);
CREATE INDEX IF NOT EXISTS idx_cash_movements_created_at ON cash_movements(created_at);
