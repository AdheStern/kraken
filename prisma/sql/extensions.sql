-- prisma/sql/extensions.sql
-- Extensiones que exigen las restricciones de la migración inicial (btree_gist para EXCLUDE con igualdad).

CREATE EXTENSION IF NOT EXISTS btree_gist;
