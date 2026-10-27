-- prisma/sql/documentation.sql
-- Restricciones del esquema doc que Prisma no expresa (AGENTS.md §2.10).

-- REGLA: una lección aprendida siempre tiene título; un archivo subido nunca lo lleva.
ALTER TABLE doc.documento
  ADD CONSTRAINT documento_titulo_ck CHECK ((tipo = 'LECCION') = (titulo IS NOT NULL));
