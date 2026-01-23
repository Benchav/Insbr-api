-- Migración: Eliminar columna delivery_date de credit_accounts
-- Fecha: 2026-01-22
-- Descripción: Elimina la columna delivery_date ya que se eliminó la funcionalidad de encargos

-- Eliminar columna delivery_date
ALTER TABLE credit_accounts DROP COLUMN delivery_date;

-- Verificar que la columna se eliminó correctamente
-- PRAGMA table_info(credit_accounts);
