-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "doc";

-- CreateTable
CREATE TABLE "doc"."fase" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc"."proyecto" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "cliente_id" UUID NOT NULL,
    "contacto_id" UUID,
    "contacto_nombre" TEXT,
    "contacto_correo" TEXT,
    "contacto_telefono" TEXT,
    "encargado_id" TEXT NOT NULL,
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doc"."proyecto_tecnologia" (
    "proyecto_id" UUID NOT NULL,
    "tecnologia_id" UUID NOT NULL,

    CONSTRAINT "proyecto_tecnologia_pkey" PRIMARY KEY ("proyecto_id","tecnologia_id")
);

-- CreateTable
CREATE TABLE "doc"."documento" (
    "id" UUID NOT NULL,
    "proyecto_id" UUID NOT NULL,
    "fase_id" UUID NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "subido_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "documento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fase_nombre_key" ON "doc"."fase"("nombre");

-- CreateIndex
CREATE INDEX "proyecto_cliente_id_idx" ON "doc"."proyecto"("cliente_id");

-- CreateIndex
CREATE INDEX "documento_proyecto_id_fase_id_idx" ON "doc"."documento"("proyecto_id", "fase_id");

-- AddForeignKey
ALTER TABLE "doc"."proyecto" ADD CONSTRAINT "proyecto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc"."proyecto" ADD CONSTRAINT "proyecto_contacto_id_fkey" FOREIGN KEY ("contacto_id") REFERENCES "core"."cliente_contacto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc"."proyecto" ADD CONSTRAINT "proyecto_encargado_id_fkey" FOREIGN KEY ("encargado_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc"."proyecto" ADD CONSTRAINT "proyecto_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc"."proyecto_tecnologia" ADD CONSTRAINT "proyecto_tecnologia_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "doc"."proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc"."proyecto_tecnologia" ADD CONSTRAINT "proyecto_tecnologia_tecnologia_id_fkey" FOREIGN KEY ("tecnologia_id") REFERENCES "core"."tecnologia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc"."documento" ADD CONSTRAINT "documento_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "doc"."proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc"."documento" ADD CONSTRAINT "documento_fase_id_fkey" FOREIGN KEY ("fase_id") REFERENCES "doc"."fase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doc"."documento" ADD CONSTRAINT "documento_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;
