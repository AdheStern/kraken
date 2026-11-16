-- GROSS UP y RET DIMA de la línea: montos que Administración y las gerencias corrigen en cualquier estado
-- (AGENTS.md §2.1 y §2.3, decisión 2026-11-16).
ALTER TABLE "cv"."linea" ADD COLUMN "gross_up" DECIMAL(18,2),
ADD COLUMN "ret_dima" DECIMAL(18,2);

-- prisma/sql/cv.sql: nunca negativos
ALTER TABLE cv.linea
  ADD CONSTRAINT linea_gross_up_ret_dima_ck CHECK (
    (gross_up IS NULL OR gross_up >= 0) AND (ret_dima IS NULL OR ret_dima >= 0)
  );

-- prisma/sql/cv.sql: el trigger admite cambiar solo GROSS UP y RET DIMA en cualquier estado
CREATE OR REPLACE FUNCTION cv.bloquear_version_cerrada() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_posventa text[] := CASE TG_TABLE_NAME
    WHEN 'linea' THEN ARRAY['observaciones', 'po_numero', 'bc', 'activacion_inicio', 'activacion_fin']
    WHEN 'leasing_linea' THEN ARRAY['notas', 'seriales', 'po_numero']
    ELSE ARRAY[]::text[]
  END;
BEGIN
  -- REGLA: GROSS UP y RET DIMA se corrigen en cualquier estado de la versión (§2.3, decisión 2026-11-16).
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'linea'
    AND (to_jsonb(NEW) - ARRAY['gross_up', 'ret_dima']) = (to_jsonb(OLD) - ARRAY['gross_up', 'ret_dima']) THEN
    RETURN NEW;
  END IF;
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
