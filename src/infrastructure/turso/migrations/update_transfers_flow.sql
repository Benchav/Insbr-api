-- src/infrastructure/turso/migrations/update_transfers_flow.sql

-- 1. Agregar columnas nuevas a la tabla transfers
ALTER TABLE transfers ADD COLUMN type TEXT NOT NULL DEFAULT 'SEND';
ALTER TABLE transfers ADD COLUMN shipped_by TEXT;
ALTER TABLE transfers ADD COLUMN shipped_at TEXT;

-- 2. Actualizar registros existentes para que type = 'SEND'
UPDATE transfers SET type = 'SEND' WHERE type IS NULL;

-- 3. (Opcional) Si hay constraints de status, asegúrate de permitir los nuevos estados
-- (Asume que no hay constraint CHECK, si lo hay, deberías recrear la tabla con los nuevos valores permitidos)
