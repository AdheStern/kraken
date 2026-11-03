-- prisma/sql/cv.sql: cabecera y vendedores editables en cualquier estado, salvo los TC
CREATE OR REPLACE FUNCTION cv.bloquear_version_cerrada() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_posventa text[] := CASE TG_TABLE_NAME
    WHEN 'linea' THEN ARRAY['observaciones', 'po_numero', 'activacion_inicio', 'activacion_fin']
    WHEN 'leasing_linea' THEN ARRAY['notas', 'po_numero']
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
