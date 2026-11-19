-- prisma/migrations/20261119200000_cv_precio_final/migration.sql
-- Precio final del total de una versión de CV, editable en cualquier estado por Administración y el GG (AGENTS.md
-- §2.3, decisión 2026-11-19).
ALTER TABLE "cv"."version" ADD COLUMN "precio_final_usd" DECIMAL(18,2),
ADD COLUMN "precio_final_bs" DECIMAL(18,2),
ADD COLUMN "precio_final_base_usd" DECIMAL(18,2),
ADD COLUMN "precio_final_motivo" TEXT,
ADD COLUMN "precio_final_por_id" TEXT,
ADD COLUMN "precio_final_en" TIMESTAMPTZ;

ALTER TABLE "cv"."version" ADD CONSTRAINT "version_precio_final_por_id_fkey" FOREIGN KEY ("precio_final_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- prisma/sql/cv.sql: precio final
-- POR QUÉ: el precio final es un monto positivo y siempre lleva quién, cuándo y por qué (decisión 2026-11-19).
ALTER TABLE cv.version
  ADD CONSTRAINT version_precio_final_ck CHECK (
    (precio_final_usd IS NULL OR precio_final_usd > 0) AND (precio_final_bs IS NULL OR precio_final_bs > 0)
    AND (
      (precio_final_usd IS NULL AND precio_final_bs IS NULL)
      OR (precio_final_motivo IS NOT NULL AND precio_final_por_id IS NOT NULL AND precio_final_en IS NOT NULL
        AND precio_final_base_usd IS NOT NULL)
    )
  );

-- REGLA: fuera de BORRADOR solo cambian el estado y sus marcas de tiempo (máquina de estados, AGENTS.md §8) y la
-- cabecera, que gerentes y Administración corrigen en cualquier estado salvo el TC de costo y el de venta
-- (§2.3, decisión 2026-11-03), y el precio final que fijan Administración y el GG (decisión 2026-11-19). Montos de
-- las líneas, totales, TC, umbral y número siguen inmutables.
CREATE OR REPLACE FUNCTION cv.proteger_version() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  c_mutables CONSTANT text[] := ARRAY['estado', 'aprobada_en', 'observada_en', 'reemplazada_en', 'anulada_en', 'actualizado_en',
    'titulo', 'fecha', 'preventa_id', 'postventa_id', 'linea_principal_id', 'tipo_servicio_id', 'nueva_tecnologia',
    'cliente_final_id', 'datos_cliente', 'oc_numero', 'oc_fecha', 'terminos_pago', 'fecha_entrega', 'notas',
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
