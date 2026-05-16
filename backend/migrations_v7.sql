-- ==============================================================================
-- MIGRACIÓN V7: Actualizar ENUM tipo_movimiento
-- EJECUTAR EN SUPABASE SQL EDITOR
-- ==============================================================================

-- Intentar agregar los nuevos valores al ENUM. 
-- Nota: Si tipo_movimiento no es un ENUM sino un CHECK constraint, esto fallará.
-- Pero el mensaje de error indica que es un ENUM.

ALTER TYPE tipo_movimiento ADD VALUE IF NOT EXISTS 'ENVIO';
ALTER TYPE tipo_movimiento ADD VALUE IF NOT EXISTS 'TRANSFERENCIA';
ALTER TYPE tipo_movimiento ADD VALUE IF NOT EXISTS 'DEVOLUCION';
ALTER TYPE tipo_movimiento ADD VALUE IF NOT EXISTS 'SINIESTRO';

-- === RESUMEN OK ===
SELECT 'Migración V7 Completada' as resultado;
