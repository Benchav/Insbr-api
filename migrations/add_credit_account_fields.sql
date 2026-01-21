-- Migración: Agregar campos para gestión de encargos
-- Fecha: 2026-01-21
-- Descripción: Agrega campos opcionales para fecha de entrega, notas y número de factura

-- Agregar columna delivery_date para fecha de entrega de encargos (CXC)
ALTER TABLE credit_accounts ADD COLUMN delivery_date TEXT;

-- Agregar columna notes para notas/motivo del encargo
ALTER TABLE credit_accounts ADD COLUMN notes TEXT;

-- Agregar columna invoice_number para número de factura del proveedor (CPP)
ALTER TABLE credit_accounts ADD COLUMN invoice_number TEXT;

-- Verificar que las columnas se agregaron correctamente
-- SELECT * FROM pragma_table_info('credit_accounts');
