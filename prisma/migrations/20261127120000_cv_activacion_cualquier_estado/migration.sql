-- El rango de activación de las licencias se completa en cualquier estado de la versión (AGENTS.md §2.3,
-- decisión 2026-11-27). Solo cambia el trigger; ninguna columna.

-- prisma/sql/cv.sql: el trigger admite cambiar solo GROSS UP, RET DIMA y el rango de activación en cualquier estado
CREATE OR REPLACE FUNCTION cv.bloquear_version_cerrada() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_posventa text[] := CASE TG_TABLE_NAME
    WHEN 'linea' THEN ARRAY['observaciones', 'po_numero', 'bc', 'activacion_inicio', 'activacion_fin']
    WHEN 'leasing_linea' THEN ARRAY['notas', 'seriales', 'po_numero']
    ELSE ARRAY[]::text[]
  END;
  v_cualquier_estado text[] := ARRAY['gross_up', 'ret_dima', 'activacion_inicio', 'activacion_fin'];
BEGIN
  -- REGLA: GROSS UP y RET DIMA (§2.3, decisión 2026-11-16) y el rango de activación (decisión 2026-11-27) se
  -- corrigen en cualquier estado de la versión.
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'linea'
    AND (to_jsonb(NEW) - v_cualquier_estado) = (to_jsonb(OLD) - v_cualquier_estado) THEN
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
