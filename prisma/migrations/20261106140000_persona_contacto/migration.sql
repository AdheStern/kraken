-- Personas de contacto y puestos por cliente (decisión 2026-11-06): una ficha por persona aunque cambie de empresa.
-- Cada contacto existente pasa a ser una persona con su mismo id y queda como su puesto en el cliente.

CREATE TABLE "core"."persona_contacto" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombre_normalizado" TEXT NOT NULL,
    "correo_personal" TEXT,
    "telefono_personal" TEXT,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "persona_contacto_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "core"."cliente_contacto" ADD COLUMN     "desde" DATE,
ADD COLUMN     "hasta" DATE,
ADD COLUMN     "motivo_salida" TEXT,
ADD COLUMN     "municipio_id" UUID,
ADD COLUMN     "persona_id" UUID,
ADD COLUMN     "sucursal_id" UUID;

-- REGLA: el nombre normalizado es el mismo de normalizeContactName (src/domain/customers/contact-normalize.ts).
INSERT INTO "core"."persona_contacto" ("id", "nombre", "nombre_normalizado")
SELECT "id", "nombre",
       lower(regexp_replace(btrim(translate("nombre", 'ÁÉÍÓÚÜÑáéíóúüñ', 'AEIOUUNaeiouun')), '\s+', ' ', 'g'))
FROM "core"."cliente_contacto";

UPDATE "core"."cliente_contacto" SET "persona_id" = "id";

ALTER TABLE "core"."cliente_contacto" ALTER COLUMN "persona_id" SET NOT NULL;

CREATE TABLE "core"."cliente_contacto_area" (
    "contacto_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,

    CONSTRAINT "cliente_contacto_area_pkey" PRIMARY KEY ("contacto_id","area_id")
);

CREATE TABLE "core"."cliente_contacto_usuario" (
    "contacto_id" UUID NOT NULL,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "cliente_contacto_usuario_pkey" PRIMARY KEY ("contacto_id","usuario_id")
);

CREATE INDEX "persona_contacto_nombre_normalizado_idx" ON "core"."persona_contacto"("nombre_normalizado");
CREATE INDEX "cliente_contacto_persona_id_idx" ON "core"."cliente_contacto"("persona_id");
CREATE UNIQUE INDEX "puesto_activo_unico" ON "core"."cliente_contacto"("persona_id", "cliente_id") WHERE (activo);

ALTER TABLE "core"."cliente_contacto" ADD CONSTRAINT "cliente_contacto_persona_id_fkey" FOREIGN KEY ("persona_id") REFERENCES "core"."persona_contacto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."cliente_contacto" ADD CONSTRAINT "cliente_contacto_municipio_id_fkey" FOREIGN KEY ("municipio_id") REFERENCES "core"."municipio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core"."cliente_contacto" ADD CONSTRAINT "cliente_contacto_sucursal_id_fkey" FOREIGN KEY ("sucursal_id") REFERENCES "core"."cliente_sucursal"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "core"."cliente_contacto_area" ADD CONSTRAINT "cliente_contacto_area_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "core"."cliente_contacto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."cliente_contacto_area" ADD CONSTRAINT "cliente_contacto_area_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "core"."cliente_contacto_usuario" ADD CONSTRAINT "cliente_contacto_usuario_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "core"."cliente_contacto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "core"."cliente_contacto_usuario" ADD CONSTRAINT "cliente_contacto_usuario_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;
