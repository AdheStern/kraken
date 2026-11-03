-- prisma/sql/cv.sql: la versión nueva en aprobación u observada recibe los datos posventa copiados
-- REGLA: en la versión APROBADA siguen editables los datos que se completan después de la venta y no tocan montos
-- (AGENTS.md §2.3, decisión 2026-11-03): observaciones, PO# y rango de activación de la línea, notas y PO# del
-- leasing, y los seriales de la línea. Lo demás sigue inmutable. Una versión posterior EN_APROBACION u OBSERVADA
-- de un CV aprobado los recibe copiados, para que no se pierdan al aprobarla.
CREATE OR REPLACE FUNCTION cv.admite_datos_posventa(p_version_id uuid) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM cv.version v
    WHERE v.id = p_version_id
      AND (v.estado = 'APROBADA'
        OR (v.estado IN ('EN_APROBACION', 'OBSERVADA') AND EXISTS (
          SELECT 1 FROM cv.version a
          WHERE a.cv_id = v.cv_id AND a.estado = 'APROBADA' AND a.numero < v.numero)))
  );
$$;

CREATE OR REPLACE FUNCTION cv.bloquear_version_cerrada() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_posventa text[] := CASE TG_TABLE_NAME
    WHEN 'linea' THEN ARRAY['observaciones', 'po_numero', 'activacion_inicio', 'activacion_fin']
    WHEN 'leasing_linea' THEN ARRAY['notas', 'po_numero']
    ELSE ARRAY[]::text[]
  END;
BEGIN
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

CREATE OR REPLACE FUNCTION cv.bloquear_serial_version_cerrada() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT'
    AND cv.admite_datos_posventa((SELECT version_id FROM cv.linea WHERE id = NEW.linea_id)) THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'DELETE'
    AND cv.admite_datos_posventa((SELECT version_id FROM cv.linea WHERE id = OLD.linea_id)) THEN
    RETURN OLD;
  END IF;
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM cv.exigir_version_borrador((SELECT version_id FROM cv.linea WHERE id = OLD.linea_id));
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM cv.exigir_version_borrador((SELECT version_id FROM cv.linea WHERE id = NEW.linea_id));
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

DROP FUNCTION cv.es_version_aprobada(uuid);
