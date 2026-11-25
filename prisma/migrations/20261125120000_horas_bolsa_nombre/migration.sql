-- prisma/migrations/20261125120000_horas_bolsa_nombre/migration.sql
-- Nombre opcional de la bolsa de horas para los técnicos; sin él se muestra la descripción de su línea
-- del CV (AGENTS.md §2.4, decisión 2026-11-25).
ALTER TABLE "horas"."bolsa" ADD COLUMN "nombre" VARCHAR(120);
