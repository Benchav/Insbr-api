-- Migración: Agregar columna credit_days a la tabla customers
-- Fecha: 2026-01-22
-- Descripción: Permite configurar días de crédito por cliente para cálculo automático de dueDate

-- 1. Agregar columna credit_days con valor por defecto de 30 días
ALTER TABLE customers ADD COLUMN credit_days INTEGER DEFAULT 30;

-- 2. Actualizar clientes existentes según su tipo
-- Minoristas: 15 días de crédito
UPDATE customers SET credit_days = 15 WHERE type = 'RETAIL';

-- Mayoristas: 30 días de crédito
UPDATE customers SET credit_days = 30 WHERE type = 'WHOLESALE';

-- 3. Verificar que la columna se agregó correctamente
-- SELECT id, name, type, credit_days FROM customers LIMIT 10;
