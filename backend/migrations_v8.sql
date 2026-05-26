-- ─────────────────────────────────────────────────────────────
-- migrations_v8.sql — Unificación de rol PERSONAL → ADMIN
--                     + columna total_siniestros en facturacion
-- ─────────────────────────────────────────────────────────────
-- IMPORTANTE: Ejecutar en Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────

-- [1] Renombrar el valor del ENUM 'PERSONAL' a 'ADMIN'
-- Si el tipo se llama 'rol_usuario':
ALTER TYPE rol_usuario RENAME VALUE 'PERSONAL' TO 'ADMIN';

-- Alternativa (si es VARCHAR, no ENUM):
-- UPDATE usuario SET rol = 'ADMIN' WHERE rol = 'PERSONAL';

-- ─────────────────────────────────────────────────────────────

-- [2] Añadir columna total_siniestros a la tabla facturacion
--     para trazabilidad contable separada del total_almacenamiento.
ALTER TABLE facturacion
  ADD COLUMN IF NOT EXISTS total_siniestros NUMERIC(12, 2) NOT NULL DEFAULT 0;

-- Verificar resultado:
-- SELECT id, total_almacenamiento, total_siniestros, total FROM facturacion LIMIT 5;
