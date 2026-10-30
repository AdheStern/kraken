-- prisma/sql/cv.sql
-- Restricciones del esquema cv: versiones inmutables fuera de BORRADOR (ADR-11) y reglas de línea (AGENTS.md §2.1–2.2).

ALTER TABLE cv.linea
  ADD CONSTRAINT linea_area_obligatoria_ck CHECK (tipo_linea <> 'ITEM' OR area_id IS NOT NULL),
  ADD CONSTRAINT linea_factor_sin_costo_ck CHECK (factor IS NULL OR costo_unit_usd > 0);

-- POR QUÉ: el color viaja tal cual al relleno del Excel (ARGB); solo se acepta RRGGBB en mayúsculas.
ALTER TABLE cv.linea
  ADD CONSTRAINT linea_color_ck CHECK (color IS NULL OR color ~ '^[0-9A-F]{6}$');

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

CREATE FUNCTION cv.bloquear_version_cerrada() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    PERFORM cv.exigir_version_borrador(OLD.version_id);
  END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM cv.exigir_version_borrador(NEW.version_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END $$;

CREATE FUNCTION cv.bloquear_serial_version_cerrada() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
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

-- REGLA: fuera de BORRADOR solo cambian el estado y sus marcas de tiempo (máquina de estados, AGENTS.md §8).
CREATE FUNCTION cv.proteger_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c_mutables CONSTANT text[] := ARRAY['estado', 'aprobada_en', 'observada_en', 'reemplazada_en', 'anulada_en', 'actualizado_en'];
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
