-- ─────────────────────────────────────────────────────────────
-- migrations_v8.sql — Unificación de rol PERSONAL → ADMIN
-- ─────────────────────────────────────────────────────────────
-- IMPORTANTE: Ejecutar en Supabase SQL Editor.
-- Esta migración renombra el valor del ENUM 'PERSONAL' a 'ADMIN'
-- y actualiza todos los registros existentes.
-- ─────────────────────────────────────────────────────────────

-- Paso 1: Renombrar el valor del ENUM (si el rol es un tipo ENUM en PostgreSQL)
-- Supabase usa tipos ENUM de PostgreSQL. Si el tipo se llama 'rol_usuario':
ALTER TYPE rol_usuario RENAME VALUE 'PERSONAL' TO 'ADMIN';

-- Paso 2 (Alternativa si el paso 1 falla porque no existe el ENUM con ese valor
-- o si el rol es un VARCHAR): Actualizar registros directamente.
-- UPDATE usuario SET rol = 'ADMIN' WHERE rol = 'PERSONAL';

-- Verificar resultado:
-- SELECT id, nombre, email, rol FROM usuario ORDER BY rol;
