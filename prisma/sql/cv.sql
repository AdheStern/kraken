-- prisma/sql/cv.sql
-- Restricciones del esquema cv: versiones inmutables fuera de BORRADOR (ADR-11) y reglas de línea (AGENTS.md §2.1–2.2).

ALTER TABLE cv.linea
  ADD CONSTRAINT linea_area_obligatoria_ck CHECK (tipo_linea <> 'ITEM' OR area_id IS NOT NULL),
  ADD CONSTRAINT linea_factor_sin_costo_ck CHECK (factor IS NULL OR costo_unit_usd > 0);

-- POR QUÉ: el color viaja tal cual al relleno del Excel (ARGB); solo se acepta RRGGBB en mayúsculas.
ALTER TABLE cv.linea
  ADD CONSTRAINT linea_color_ck CHECK (color IS NULL OR color ~ '^[0-9A-F]{6}$');

-- POR QUÉ: el número 1.1 se deriva del orden; una nota no lleva número y no puede ser subítem.
ALTER TABLE cv.linea
  ADD CONSTRAINT linea_subitem_solo_item_ck CHECK (tipo_linea = 'ITEM' OR NOT es_subitem);

-- POR QUÉ: el rango de activación es de licencias (tipo INTANGIBLE) y va completo: inicio y fin, en orden.
ALTER TABLE cv.linea
  ADD CONSTRAINT linea_rango_activacion_ck CHECK (
    (activacion_inicio IS NULL AND activacion_fin IS NULL)
    OR (tipo_item = 'INTANGIBLE' AND activacion_inicio IS NOT NULL AND activacion_fin >= activacion_inicio)
  );

-- POR QUÉ: la solicitud del GG tiene area_id nulo; NULLS NOT DISTINCT impide dos solicitudes del GG por versión.
DROP INDEX cv.solicitud_aprobacion_unica;
CREATE UNIQUE INDEX solicitud_aprobacion_unica ON cv.solicitud_aprobacion (version_id, tipo, area_id) NULLS NOT DISTINCT;

CREATE FUNCTION cv.exigir_version_borrador(p_version_id uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_estado text;
BEGIN
  SELECT estado::text INTO v_estado FROM cv.version WHERE id = p_version_id;
  -- TRAMPA: en el borrado en cascada de una versión BORRADOR la fila padre ya no existe; se permite.
  IF v_estado IS NOT NULL AND v_estado <> 'BORRADOR' THEN
    RAISE EXCEPTION 'La versión % está en % y no admite cambios', p_version_id, v_estado
      USING ERRCODE = 'check_violation';
  END IF;
END $$;

-- REGLA: en la versión APROBADA siguen editables los datos que se completan después de la venta y no tocan montos
-- (AGENTS.md §2.3, decisión 2026-11-03): observaciones, PO#, BC y rango de activación de la línea, notas, seriales
-- y PO# del leasing, y los seriales de la línea. Lo demás sigue inmutable. Una versión posterior EN_APROBACION u OBSERVADA
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

CREATE TRIGGER bloquear_version_cerrada BEFORE INSERT OR UPDATE OR DELETE ON cv.linea
  FOR EACH ROW EXECUTE FUNCTION cv.bloquear_version_cerrada();
CREATE TRIGGER bloquear_version_cerrada BEFORE INSERT OR UPDATE OR DELETE ON cv.grupo
  FOR EACH ROW EXECUTE FUNCTION cv.bloquear_version_cerrada();
CREATE TRIGGER bloquear_version_cerrada BEFORE INSERT OR UPDATE OR DELETE ON cv.leasing_linea
  FOR EACH ROW EXECUTE FUNCTION cv.bloquear_version_cerrada();
CREATE TRIGGER bloquear_version_cerrada BEFORE INSERT OR UPDATE OR DELETE ON cv.version_vendedor
  FOR EACH ROW EXECUTE FUNCTION cv.bloquear_version_cerrada();
CREATE TRIGGER bloquear_version_cerrada BEFORE INSERT OR UPDATE OR DELETE ON cv.linea_serial
  FOR EACH ROW EXECUTE FUNCTION cv.bloquear_serial_version_cerrada();

-- REGLA: fuera de BORRADOR solo cambian el estado y sus marcas de tiempo (máquina de estados, AGENTS.md §8) y la
-- cabecera, que gerentes y Administración corrigen en cualquier estado salvo el TC de costo y el de venta
-- (§2.3, decisión 2026-11-03). Montos, TC, umbral y número siguen inmutables.
CREATE OR REPLACE FUNCTION cv.proteger_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c_mutables CONSTANT text[] := ARRAY['estado', 'aprobada_en', 'observada_en', 'reemplazada_en', 'anulada_en', 'actualizado_en',
    'titulo', 'fecha', 'preventa_id', 'postventa_id', 'linea_principal_id', 'tipo_servicio_id', 'nueva_tecnologia',
    'cliente_final_id', 'datos_cliente', 'oc_numero', 'oc_fecha', 'terminos_pago', 'fecha_entrega', 'notas'];
BEGIN
  IF OLD.estado = 'BORRADOR' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF TG_OP = 'DELETE' OR (to_jsonb(NEW) - c_mutables) IS DISTINCT FROM (to_jsonb(OLD) - c_mutables) THEN
    RAISE EXCEPTION 'La versión % está en % y es inmutable', OLD.id, OLD.estado
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER proteger_version BEFORE UPDATE OR DELETE ON cv.version
  FOR EACH ROW EXECUTE FUNCTION cv.proteger_version();
