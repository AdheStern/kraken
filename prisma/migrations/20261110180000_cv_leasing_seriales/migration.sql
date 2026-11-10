-- Seriales del leasing en la misma fila, dato posventa como sus notas y PO# (AGENTS.md §2.1 y §2.3).
ALTER TABLE "cv"."leasing_linea" ADD COLUMN "seriales" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- prisma/sql/cv.sql: los seriales entran en los datos posventa del leasing
CREATE OR REPLACE FUNCTION cv.bloquear_version_cerrada() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_posventa text[] := CASE TG_TABLE_NAME
    WHEN 'linea' THEN ARRAY['observaciones', 'po_numero', 'bc', 'activacion_inicio', 'activacion_fin']
    WHEN 'leasing_linea' THEN ARRAY['notas', 'seriales', 'po_numero']
    ELSE ARRAY[]::text[]
  END;
BEGIN
  -- REGLA: los vendedores son parte de la cabecera y se corrigen en cualquier estado (§2.3, decisión 2026-11-03).
  IF TG_TABLE_NAME = 'version_vendedor' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'UPDATE' AND cardinality(v_posventa) > 0
    AND (to_jsonb(NEW) - v_posventa) = (to_jsonb(OLD) - v_posventa)
    AND cv.admite_datos_posventa(NEW.version_id) THEN
    RETURN NEW;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM cv.exigir_version_borrador(OLD.version_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM cv.exigir_version_borrador(NEW.version_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;
