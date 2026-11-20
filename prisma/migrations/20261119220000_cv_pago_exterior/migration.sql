-- prisma/migrations/20261119220000_cv_pago_exterior/migration.sql
-- Indicador informativo de pago local o en el exterior en la cabecera del CV, editable como la cabecera en
-- cualquier estado (AGENTS.md §2.1 y §2.3, decisión 2026-11-19).
ALTER TABLE "cv"."version" ADD COLUMN "pago_exterior" BOOLEAN NOT NULL DEFAULT false;

-- prisma/sql/cv.sql: proteger_version con pago_exterior entre las columnas de cabecera
-- REGLA: fuera de BORRADOR solo cambian el estado y sus marcas de tiempo (máquina de estados, AGENTS.md §8) y la
-- cabecera, que gerentes y Administración corrigen en cualquier estado salvo el TC de costo y el de venta
-- (§2.3, decisión 2026-11-03), y el precio final que fijan Administración y el GG (decisión 2026-11-19). Montos de
-- las líneas, totales, TC, umbral y número siguen inmutables.
CREATE OR REPLACE FUNCTION cv.proteger_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c_mutables CONSTANT text[] := ARRAY['estado', 'aprobada_en', 'observada_en', 'reemplazada_en', 'anulada_en', 'actualizado_en',
    'titulo', 'fecha', 'preventa_id', 'postventa_id', 'linea_principal_id', 'tipo_servicio_id', 'nueva_tecnologia',
    'cliente_final_id', 'datos_cliente', 'oc_numero', 'oc_fecha', 'terminos_pago', 'pago_exterior', 'fecha_entrega', 'notas',
    'precio_final_usd', 'precio_final_bs', 'precio_final_base_usd', 'precio_final_motivo', 'precio_final_por_id',
    'precio_final_en'];
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
