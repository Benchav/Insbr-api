-- Migración: Actualizar roles de usuarios
-- Fecha: 2026-01-21
-- Descripción: Actualiza el CHECK constraint de la tabla users para permitir los nuevos roles

-- Paso 1: Crear tabla temporal con el nuevo constraint
CREATE TABLE users_new (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'GERENTE', 'CAJERO')),
    branch_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (branch_id) REFERENCES branches(id)
);

-- Paso 2: Copiar datos existentes (si los hay)
INSERT INTO users_new SELECT * FROM users WHERE role IN ('ADMIN', 'GERENTE', 'CAJERO');

-- Paso 3: Eliminar tabla antigua
DROP TABLE users;

-- Paso 4: Renombrar tabla nueva
ALTER TABLE users_new RENAME TO users;
