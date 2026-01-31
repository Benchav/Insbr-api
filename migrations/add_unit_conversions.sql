-- ============================================
-- MIGRACIÓN: Sistema de Conversión de Unidades
-- Fecha: 2026-01-31
-- NOTA: Turso/libSQL no soporta ALTER TABLE ADD COLUMN en todas las situaciones
-- Por lo tanto, esta migración solo crea la nueva tabla
-- Las columnas adicionales se manejarán en el código
-- ============================================

-- ============================================
-- TABLA: unit_conversions (Conversiones de Unidades)
-- ============================================
CREATE TABLE IF NOT EXISTS unit_conversions (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    unit_name TEXT NOT NULL,              -- Nombre de la unidad (ej: "Quintal", "Libra")
    unit_symbol TEXT NOT NULL,            -- Símbolo (ej: "qq", "lb")
    conversion_factor REAL NOT NULL,      -- Factor de conversión a unidad base
    unit_type TEXT NOT NULL CHECK(unit_type IN ('BASE', 'PURCHASE', 'SALE')),
    
    -- Precios específicos por unidad (opcionales, en centavos)
    retail_price INTEGER,                 -- Precio al menudeo para esta unidad
    wholesale_price INTEGER,              -- Precio al mayoreo para esta unidad
    
    -- Clasificación de venta
    sales_type TEXT CHECK(sales_type IN ('RETAIL', 'WHOLESALE', 'BOTH')) DEFAULT 'BOTH',
    
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_unit_conversions_product_id ON unit_conversions(product_id);
CREATE INDEX IF NOT EXISTS idx_unit_conversions_unit_type ON unit_conversions(unit_type);
CREATE INDEX IF NOT EXISTS idx_unit_conversions_sales_type ON unit_conversions(sales_type);
CREATE INDEX IF NOT EXISTS idx_unit_conversions_is_active ON unit_conversions(is_active);
