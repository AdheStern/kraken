-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "audit";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "core";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "cv";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "fx";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "horas";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "inv";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "notif";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "tickets";

-- CreateEnum
CREATE TYPE "core"."ItemType" AS ENUM ('HARDWARE', 'INTANGIBLE', 'SERVICIO');

-- CreateEnum
CREATE TYPE "core"."RoleCode" AS ENUM ('GERENTE_GENERAL', 'GERENTE_AREA', 'COMERCIAL', 'PREVENTA', 'INGENIERO', 'COORDINADOR_SOPORTE', 'ALMACEN', 'ADMINISTRACION', 'ADMIN_SISTEMA');

-- CreateEnum
CREATE TYPE "core"."RoleSource" AS ENUM ('ENTRA', 'MANUAL');

-- CreateEnum
CREATE TYPE "cv"."CvLineKind" AS ENUM ('ITEM', 'NOTA');

-- CreateEnum
CREATE TYPE "cv"."SupplyMode" AS ENUM ('LOCAL', 'IMPORTACION', 'STOCK_DIMA', 'SERVICIO_PROPIO');

-- CreateEnum
CREATE TYPE "cv"."PricingSource" AS ENUM ('FACTOR', 'PRECIO');

-- CreateEnum
CREATE TYPE "cv"."CvVersionStatus" AS ENUM ('BORRADOR', 'EN_APROBACION', 'OBSERVADA', 'APROBADA', 'REEMPLAZADA', 'ANULADA');

-- CreateEnum
CREATE TYPE "cv"."ApprovalKind" AS ENUM ('AREA', 'GERENCIA_GENERAL');

-- CreateEnum
CREATE TYPE "cv"."ApprovalStatus" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'CERRADA');

-- CreateEnum
CREATE TYPE "cv"."CvAttachmentKind" AS ENUM ('OC_CLIENTE', 'OTRO');

-- CreateEnum
CREATE TYPE "fx"."FxSource" AS ENUM ('CUCU', 'MANUAL');

-- CreateEnum
CREATE TYPE "horas"."BagModality" AS ENUM ('H8X5', 'H24X7');

-- CreateEnum
CREATE TYPE "horas"."BagScope" AS ENUM ('AREA', 'PROYECTO', 'GENERAL');

-- CreateEnum
CREATE TYPE "horas"."BagStatus" AS ENUM ('ACTIVA', 'AGOTADA', 'VENCIDA', 'CERRADA');

-- CreateEnum
CREATE TYPE "horas"."HourMovementKind" AS ENUM ('APERTURA', 'CONSUMO', 'REVERSO', 'AJUSTE', 'VENCIMIENTO');

-- CreateEnum
CREATE TYPE "horas"."PendingHoursStatus" AS ENUM ('PENDIENTE', 'APLICADA');

-- CreateEnum
CREATE TYPE "inv"."WarehouseKind" AS ENUM ('FISICO', 'TRANSITO', 'DEMOSTRACION', 'REPUESTOS');

-- CreateEnum
CREATE TYPE "inv"."InvMovementKind" AS ENUM ('INGRESO', 'SALIDA', 'TRASPASO', 'AJUSTE', 'DEVOLUCION');

-- CreateEnum
CREATE TYPE "inv"."SerialStatus" AS ENUM ('EN_STOCK', 'EN_TRANSITO', 'RESERVADO', 'DESPACHADO');

-- CreateEnum
CREATE TYPE "inv"."TransferStatus" AS ENUM ('BORRADOR', 'EN_TRANSITO', 'RECIBIDO', 'RECIBIDO_CON_DIFERENCIAS', 'CANCELADO');

-- CreateEnum
CREATE TYPE "inv"."AdjustmentStatus" AS ENUM ('PENDIENTE', 'APROBADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "inv"."ReservationStatus" AS ENUM ('ACTIVA', 'CONSUMIDA', 'LIBERADA');

-- CreateEnum
CREATE TYPE "notif"."OutboxStatus" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- CreateEnum
CREATE TYPE "tickets"."SlaKind" AS ENUM ('PRIMERA_RESPUESTA', 'RESOLUCION');

-- CreateEnum
CREATE TYPE "tickets"."SlaStatus" AS ENUM ('EN_CURSO', 'PAUSADO', 'CUMPLIDO', 'INCUMPLIDO');

-- CreateEnum
CREATE TYPE "tickets"."TimeEntrySource" AS ENUM ('CONTADOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "tickets"."TimerEventKind" AS ENUM ('INICIAR', 'PAUSAR', 'REANUDAR', 'TERMINAR');

-- CreateEnum
CREATE TYPE "tickets"."TicketKind" AS ENUM ('SOPORTE', 'PROYECTO');

-- CreateEnum
CREATE TYPE "tickets"."TicketStatus" AS ENUM ('NUEVO', 'ASIGNADO', 'EN_PROGRESO', 'EN_ESPERA_CLIENTE', 'RESUELTO', 'CERRADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "tickets"."TicketPriority" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "tickets"."SubtaskStatus" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "tickets"."ProjectStatus" AS ENUM ('ACTIVO', 'CERRADO');

-- CreateTable
CREATE TABLE "audit"."evento" (
    "id" UUID NOT NULL,
    "actor_id" TEXT,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "antes" JSONB,
    "despues" JSONB,
    "ip" TEXT,
    "request_id" TEXT,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."horario_oficina" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "horario_oficina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."horario_franja" (
    "id" UUID NOT NULL,
    "horario_id" UUID NOT NULL,
    "dia_semana" INTEGER NOT NULL,
    "minuto_inicio" INTEGER NOT NULL,
    "minuto_fin" INTEGER NOT NULL,

    CONSTRAINT "horario_franja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."feriado" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad_id" UUID,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "feriado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."cliente" (
    "id" UUID NOT NULL,
    "razon_social" TEXT NOT NULL,
    "nit" TEXT,
    "correo" TEXT,
    "telefono" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "pais" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."cliente_contacto" (
    "id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "correo" TEXT,
    "telefono" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "cliente_contacto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."proveedor" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "proveedor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."tecnologia" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tecnologia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."unidad" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "es_horas" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "unidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."tipo_servicio" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "tipo_servicio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."producto" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "tecnologia_id" UUID,
    "unidad_id" UUID,
    "tipo_item" "core"."ItemType" NOT NULL,
    "serializado" BOOLEAN NOT NULL DEFAULT false,
    "creado_desde_cv" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."area" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."ciudad" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "horario_oficina_id" UUID,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ciudad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."rol" (
    "id" UUID NOT NULL,
    "codigo" "core"."RoleCode" NOT NULL,
    "nombre" TEXT NOT NULL,

    CONSTRAINT "rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."usuario_rol" (
    "id" UUID NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "rol_id" UUID NOT NULL,
    "area_id" UUID,
    "origen" "core"."RoleSource" NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."grupo_entra_rol" (
    "id" UUID NOT NULL,
    "grupo_entra_id" TEXT NOT NULL,
    "nombre_grupo" TEXT,
    "rol_id" UUID NOT NULL,
    "area_id" UUID,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grupo_entra_rol_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."permiso_excepcion" (
    "id" UUID NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "condiciones" JSONB,
    "es_denegacion" BOOLEAN NOT NULL DEFAULT false,
    "motivo" TEXT NOT NULL,
    "otorgado_por_id" TEXT NOT NULL,
    "vence_en" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permiso_excepcion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "core"."parametro" (
    "clave" TEXT NOT NULL,
    "valor" JSONB NOT NULL,
    "descripcion" TEXT,
    "actualizado_por_id" TEXT,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "parametro_pkey" PRIMARY KEY ("clave")
);

-- CreateTable
CREATE TABLE "core"."usuario_perfil" (
    "usuario_id" TEXT NOT NULL,
    "ciudad_id" UUID,
    "cargo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "usuario_perfil_pkey" PRIMARY KEY ("usuario_id")
);

-- CreateTable
CREATE TABLE "cv"."linea" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "grupo_id" UUID,
    "posicion" INTEGER NOT NULL,
    "tipo_linea" "cv"."CvLineKind" NOT NULL,
    "area_id" UUID,
    "proveedor_id" UUID,
    "modalidad_suministro" "cv"."SupplyMode",
    "tecnologia_id" UUID,
    "tipo_item" "core"."ItemType",
    "producto_id" UUID,
    "codigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "unidad_id" UUID,
    "cantidad" DECIMAL(14,2),
    "costo_unit_usd" DECIMAL(18,2),
    "factor" DECIMAL(8,2),
    "venta_unit_usd" DECIMAL(18,2),
    "origen_precio" "cv"."PricingSource",
    "especificacion_bolsa" JSONB,
    "vigencia_inicio" DATE,
    "vigencia_fin" DATE,
    "po_numero" TEXT,
    "observaciones" TEXT,

    CONSTRAINT "linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv"."linea_serial" (
    "id" UUID NOT NULL,
    "linea_id" UUID NOT NULL,
    "serial" TEXT NOT NULL,

    CONSTRAINT "linea_serial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv"."leasing_linea" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "posicion" INTEGER NOT NULL,
    "proveedor_id" UUID,
    "tecnologia_id" UUID,
    "codigo" TEXT,
    "descripcion" TEXT NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "costo_unit_usd" DECIMAL(18,2) NOT NULL,
    "notas" TEXT,
    "po_numero" TEXT,

    CONSTRAINT "leasing_linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv"."numerador" (
    "ciudad_id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "ultimo_numero" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "numerador_pkey" PRIMARY KEY ("ciudad_id","anio")
);

-- CreateTable
CREATE TABLE "cv"."cv" (
    "id" UUID NOT NULL,
    "correlativo" INTEGER NOT NULL,
    "ciudad_id" UUID NOT NULL,
    "anio" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "cliente_id" UUID NOT NULL,
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "anulado_en" TIMESTAMPTZ,
    "motivo_anulacion" TEXT,

    CONSTRAINT "cv_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv"."version" (
    "id" UUID NOT NULL,
    "cv_id" UUID NOT NULL,
    "numero" INTEGER NOT NULL,
    "estado" "cv"."CvVersionStatus" NOT NULL DEFAULT 'BORRADOR',
    "motivo" TEXT,
    "titulo" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "preventa_id" TEXT,
    "postventa_id" TEXT,
    "linea_principal_id" UUID,
    "tipo_servicio_id" UUID,
    "nueva_tecnologia" BOOLEAN NOT NULL DEFAULT false,
    "cliente_final_id" UUID,
    "datos_cliente" JSONB NOT NULL,
    "oc_numero" TEXT,
    "oc_fecha" DATE,
    "terminos_pago" TEXT,
    "fecha_entrega" DATE,
    "notas" TEXT,
    "tc_costo" DECIMAL(12,4) NOT NULL,
    "tc_venta" DECIMAL(12,4) NOT NULL,
    "tc_oficial" DECIMAL(12,4),
    "umbral_aprobacion_usd" DECIMAL(18,2),
    "total_costo_usd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_venta_usd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,
    "enviada_en" TIMESTAMPTZ,
    "aprobada_en" TIMESTAMPTZ,
    "observada_en" TIMESTAMPTZ,
    "reemplazada_en" TIMESTAMPTZ,
    "anulada_en" TIMESTAMPTZ,

    CONSTRAINT "version_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv"."version_vendedor" (
    "version_id" UUID NOT NULL,
    "usuario_id" TEXT NOT NULL,

    CONSTRAINT "version_vendedor_pkey" PRIMARY KEY ("version_id","usuario_id")
);

-- CreateTable
CREATE TABLE "cv"."grupo" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "posicion" INTEGER NOT NULL,
    "factor" DECIMAL(8,2),

    CONSTRAINT "grupo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv"."solicitud_aprobacion" (
    "id" UUID NOT NULL,
    "version_id" UUID NOT NULL,
    "tipo" "cv"."ApprovalKind" NOT NULL,
    "area_id" UUID,
    "estado" "cv"."ApprovalStatus" NOT NULL DEFAULT 'PENDIENTE',
    "comentario" TEXT,
    "decidida_por_id" TEXT,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidida_en" TIMESTAMPTZ,

    CONSTRAINT "solicitud_aprobacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv"."adjunto" (
    "id" UUID NOT NULL,
    "cv_id" UUID NOT NULL,
    "version_id" UUID,
    "tipo" "cv"."CvAttachmentKind" NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "subido_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjunto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fx"."tipo_cambio" (
    "id" UUID NOT NULL,
    "fecha_vigencia" DATE NOT NULL,
    "compra" DECIMAL(12,4) NOT NULL,
    "venta" DECIMAL(12,4) NOT NULL,
    "fuente" "fx"."FxSource" NOT NULL,
    "obtenido_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creado_por_id" TEXT,

    CONSTRAINT "tipo_cambio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horas"."bolsa" (
    "id" UUID NOT NULL,
    "cv_linea_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "proyecto_id" UUID,
    "modalidad" "horas"."BagModality" NOT NULL,
    "alcance" "horas"."BagScope" NOT NULL,
    "estado" "horas"."BagStatus" NOT NULL DEFAULT 'ACTIVA',
    "vence_el" DATE,
    "saldo_minutos" INTEGER NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bolsa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horas"."bolsa_area" (
    "bolsa_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,

    CONSTRAINT "bolsa_area_pkey" PRIMARY KEY ("bolsa_id","area_id")
);

-- CreateTable
CREATE TABLE "horas"."movimiento" (
    "id" UUID NOT NULL,
    "bolsa_id" UUID NOT NULL,
    "tipo" "horas"."HourMovementKind" NOT NULL,
    "minutos" INTEGER NOT NULL,
    "ticket_id" UUID,
    "revierte_id" UUID,
    "motivo" TEXT,
    "actor_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "horas"."pendiente_sin_bolsa" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "cliente_id" UUID NOT NULL,
    "minutos_dentro" INTEGER NOT NULL,
    "minutos_fuera" INTEGER NOT NULL,
    "estado" "horas"."PendingHoursStatus" NOT NULL DEFAULT 'PENDIENTE',
    "bolsa_aplicada_id" UUID,
    "aplicada_en" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pendiente_sin_bolsa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv"."almacen" (
    "id" UUID NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ciudad_id" UUID,
    "tipo" "inv"."WarehouseKind" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "almacen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv"."stock" (
    "id" UUID NOT NULL,
    "almacen_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "cantidad_reservada" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "costo_promedio_usd" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv"."unidad_serial" (
    "id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "serial" TEXT NOT NULL,
    "almacen_id" UUID,
    "estado" "inv"."SerialStatus" NOT NULL DEFAULT 'EN_STOCK',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidad_serial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv"."movimiento" (
    "id" UUID NOT NULL,
    "tipo" "inv"."InvMovementKind" NOT NULL,
    "almacen_id" UUID NOT NULL,
    "documento_ref" TEXT,
    "cv_linea_id" UUID,
    "ticket_id" UUID,
    "traspaso_id" UUID,
    "solicitud_ajuste_id" UUID,
    "notas" TEXT,
    "actor_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimiento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv"."movimiento_linea" (
    "id" UUID NOT NULL,
    "movimiento_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "costo_unit_usd" DECIMAL(18,2) NOT NULL,
    "unidad_serial_id" UUID,

    CONSTRAINT "movimiento_linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv"."traspaso" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "almacen_origen_id" UUID NOT NULL,
    "almacen_destino_id" UUID NOT NULL,
    "estado" "inv"."TransferStatus" NOT NULL DEFAULT 'BORRADOR',
    "notas" TEXT,
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enviado_por_id" TEXT,
    "enviado_en" TIMESTAMPTZ,
    "recibido_por_id" TEXT,
    "recibido_en" TIMESTAMPTZ,

    CONSTRAINT "traspaso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv"."traspaso_linea" (
    "id" UUID NOT NULL,
    "traspaso_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad_enviada" DECIMAL(14,2) NOT NULL,
    "cantidad_recibida" DECIMAL(14,2),
    "unidad_serial_id" UUID,
    "notas" TEXT,

    CONSTRAINT "traspaso_linea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv"."solicitud_ajuste" (
    "id" UUID NOT NULL,
    "almacen_id" UUID NOT NULL,
    "area_id" UUID,
    "estado" "inv"."AdjustmentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "motivo" TEXT NOT NULL,
    "lineas" JSONB NOT NULL,
    "solicitado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidido_por_id" TEXT,
    "decidido_en" TIMESTAMPTZ,
    "comentario_decision" TEXT,

    CONSTRAINT "solicitud_ajuste_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inv"."reserva" (
    "id" UUID NOT NULL,
    "cv_linea_id" UUID NOT NULL,
    "almacen_id" UUID NOT NULL,
    "producto_id" UUID NOT NULL,
    "cantidad" DECIMAL(14,2) NOT NULL,
    "cantidad_consumida" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "estado" "inv"."ReservationStatus" NOT NULL DEFAULT 'ACTIVA',
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "reserva_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notif"."salida" (
    "id" UUID NOT NULL,
    "tipo_evento" TEXT NOT NULL,
    "destinatario" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo_html" TEXT NOT NULL,
    "estado" "notif"."OutboxStatus" NOT NULL DEFAULT 'PENDIENTE',
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "proximo_intento_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_error" TEXT,
    "enviado_en" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salida_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notif"."bandeja" (
    "id" UUID NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo_evento" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cuerpo" TEXT,
    "enlace" TEXT,
    "leida_en" TIMESTAMPTZ,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bandeja_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notif"."preferencia" (
    "id" UUID NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "tipo_evento" TEXT NOT NULL,
    "correo" BOOLEAN NOT NULL DEFAULT true,
    "bandeja" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "preferencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."sla_politica" (
    "id" UUID NOT NULL,
    "modalidad" "horas"."BagModality" NOT NULL,
    "prioridad" "tickets"."TicketPriority" NOT NULL,
    "minutos_primera_respuesta" INTEGER NOT NULL,
    "minutos_resolucion" INTEGER NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "sla_politica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."sla_medicion" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "politica_id" UUID NOT NULL,
    "tipo" "tickets"."SlaKind" NOT NULL,
    "minutos_objetivo" INTEGER NOT NULL,
    "minutos_transcurridos" INTEGER NOT NULL DEFAULT 0,
    "estado" "tickets"."SlaStatus" NOT NULL DEFAULT 'EN_CURSO',
    "vence_en" TIMESTAMPTZ,
    "cumplido_en" TIMESTAMPTZ,
    "alertado_en" TIMESTAMPTZ,
    "actualizado_en" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sla_medicion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."registro_tiempo" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "subtarea_id" UUID,
    "usuario_id" TEXT NOT NULL,
    "inicio" TIMESTAMPTZ NOT NULL,
    "fin" TIMESTAMPTZ,
    "origen" "tickets"."TimeEntrySource" NOT NULL,
    "contador_id" UUID,
    "es_tardio" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registro_tiempo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."evento_contador" (
    "id" UUID NOT NULL,
    "contador_id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "subtarea_id" UUID,
    "usuario_id" TEXT NOT NULL,
    "tipo" "tickets"."TimerEventKind" NOT NULL,
    "ocurrido_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_contador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."proyecto" (
    "id" UUID NOT NULL,
    "nombre" TEXT NOT NULL,
    "cliente_id" UUID NOT NULL,
    "fecha_inicio" DATE,
    "fecha_fin" DATE,
    "estado" "tickets"."ProjectStatus" NOT NULL DEFAULT 'ACTIVO',
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proyecto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."proyecto_area" (
    "proyecto_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,

    CONSTRAINT "proyecto_area_pkey" PRIMARY KEY ("proyecto_id","area_id")
);

-- CreateTable
CREATE TABLE "tickets"."ticket" (
    "id" UUID NOT NULL,
    "numero" SERIAL NOT NULL,
    "tipo" "tickets"."TicketKind" NOT NULL,
    "proyecto_id" UUID,
    "cliente_id" UUID NOT NULL,
    "ciudad_id" UUID NOT NULL,
    "prioridad" "tickets"."TicketPriority" NOT NULL,
    "modalidad_sla" "horas"."BagModality" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "estado" "tickets"."TicketStatus" NOT NULL DEFAULT 'NUEVO',
    "encargado_id" TEXT,
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMPTZ NOT NULL,
    "primera_respuesta_en" TIMESTAMPTZ,
    "resuelto_en" TIMESTAMPTZ,
    "cerrado_en" TIMESTAMPTZ,

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."ticket_area" (
    "ticket_id" UUID NOT NULL,
    "area_id" UUID NOT NULL,

    CONSTRAINT "ticket_area_pkey" PRIMARY KEY ("ticket_id","area_id")
);

-- CreateTable
CREATE TABLE "tickets"."ticket_bolsa" (
    "ticket_id" UUID NOT NULL,
    "bolsa_id" UUID NOT NULL,
    "prioridad" INTEGER NOT NULL,

    CONSTRAINT "ticket_bolsa_pkey" PRIMARY KEY ("ticket_id","bolsa_id")
);

-- CreateTable
CREATE TABLE "tickets"."subtarea" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "asignado_id" TEXT,
    "estado" "tickets"."SubtaskStatus" NOT NULL DEFAULT 'PENDIENTE',
    "creado_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completada_en" TIMESTAMPTZ,

    CONSTRAINT "subtarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."comentario" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "autor_id" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "es_publico" BOOLEAN NOT NULL DEFAULT false,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comentario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets"."adjunto" (
    "id" UUID NOT NULL,
    "ticket_id" UUID NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "ruta" TEXT NOT NULL,
    "hash_sha256" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "tipo_mime" TEXT NOT NULL,
    "subido_por_id" TEXT NOT NULL,
    "creado_en" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "adjunto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "evento_entidad_entidad_id_idx" ON "audit"."evento"("entidad", "entidad_id");

-- CreateIndex
CREATE INDEX "evento_creado_en_idx" ON "audit"."evento"("creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "auth"."user"("email");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "auth"."session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "auth"."session"("token");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "auth"."account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "auth"."verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "horario_oficina_nombre_key" ON "core"."horario_oficina"("nombre");

-- CreateIndex
CREATE INDEX "horario_franja_horario_id_dia_semana_idx" ON "core"."horario_franja"("horario_id", "dia_semana");

-- CreateIndex
CREATE UNIQUE INDEX "feriado_unico" ON "core"."feriado"("fecha", "ciudad_id");

-- CreateIndex
CREATE INDEX "cliente_nit_idx" ON "core"."cliente"("nit");

-- CreateIndex
CREATE INDEX "cliente_contacto_cliente_id_idx" ON "core"."cliente_contacto"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "proveedor_nombre_key" ON "core"."proveedor"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "tecnologia_nombre_key" ON "core"."tecnologia"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "unidad_codigo_key" ON "core"."unidad"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_servicio_nombre_key" ON "core"."tipo_servicio"("nombre");

-- CreateIndex
CREATE INDEX "producto_codigo_idx" ON "core"."producto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "area_codigo_key" ON "core"."area"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "ciudad_codigo_key" ON "core"."ciudad"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "rol_codigo_key" ON "core"."rol"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_rol_unico" ON "core"."usuario_rol"("usuario_id", "rol_id", "area_id");

-- CreateIndex
CREATE UNIQUE INDEX "grupo_entra_rol_unico" ON "core"."grupo_entra_rol"("grupo_entra_id", "rol_id", "area_id");

-- CreateIndex
CREATE INDEX "permiso_excepcion_usuario_id_idx" ON "core"."permiso_excepcion"("usuario_id");

-- CreateIndex
CREATE INDEX "linea_version_id_posicion_idx" ON "cv"."linea"("version_id", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "linea_serial_linea_id_serial_key" ON "cv"."linea_serial"("linea_id", "serial");

-- CreateIndex
CREATE INDEX "leasing_linea_version_id_posicion_idx" ON "cv"."leasing_linea"("version_id", "posicion");

-- CreateIndex
CREATE UNIQUE INDEX "cv_codigo_key" ON "cv"."cv"("codigo");

-- CreateIndex
CREATE INDEX "cv_cliente_id_idx" ON "cv"."cv"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "cv_ciudad_id_anio_correlativo_key" ON "cv"."cv"("ciudad_id", "anio", "correlativo");

-- CreateIndex
CREATE INDEX "version_estado_idx" ON "cv"."version"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "version_cv_id_numero_key" ON "cv"."version"("cv_id", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "version_aprobada_unica" ON "cv"."version"("cv_id") WHERE (estado = 'APROBADA');

-- CreateIndex
CREATE INDEX "version_vendedor_usuario_id_idx" ON "cv"."version_vendedor"("usuario_id");

-- CreateIndex
CREATE INDEX "grupo_version_id_idx" ON "cv"."grupo"("version_id");

-- CreateIndex
CREATE INDEX "solicitud_aprobacion_estado_creado_en_idx" ON "cv"."solicitud_aprobacion"("estado", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "solicitud_aprobacion_unica" ON "cv"."solicitud_aprobacion"("version_id", "tipo", "area_id");

-- CreateIndex
CREATE INDEX "adjunto_cv_id_idx" ON "cv"."adjunto"("cv_id");

-- CreateIndex
CREATE UNIQUE INDEX "tipo_cambio_fecha_vigencia_fuente_key" ON "fx"."tipo_cambio"("fecha_vigencia", "fuente");

-- CreateIndex
CREATE UNIQUE INDEX "bolsa_cv_linea_id_key" ON "horas"."bolsa"("cv_linea_id");

-- CreateIndex
CREATE INDEX "bolsa_cliente_id_estado_idx" ON "horas"."bolsa"("cliente_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "movimiento_revierte_id_key" ON "horas"."movimiento"("revierte_id");

-- CreateIndex
CREATE INDEX "movimiento_bolsa_id_creado_en_idx" ON "horas"."movimiento"("bolsa_id", "creado_en");

-- CreateIndex
CREATE INDEX "movimiento_ticket_id_idx" ON "horas"."movimiento"("ticket_id");

-- CreateIndex
CREATE INDEX "pendiente_sin_bolsa_cliente_id_estado_idx" ON "horas"."pendiente_sin_bolsa"("cliente_id", "estado");

-- CreateIndex
CREATE UNIQUE INDEX "almacen_codigo_key" ON "inv"."almacen"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "stock_almacen_id_producto_id_key" ON "inv"."stock"("almacen_id", "producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "unidad_serial_producto_id_serial_key" ON "inv"."unidad_serial"("producto_id", "serial");

-- CreateIndex
CREATE UNIQUE INDEX "movimiento_solicitud_ajuste_id_key" ON "inv"."movimiento"("solicitud_ajuste_id");

-- CreateIndex
CREATE INDEX "movimiento_almacen_id_creado_en_idx" ON "inv"."movimiento"("almacen_id", "creado_en");

-- CreateIndex
CREATE INDEX "movimiento_linea_producto_id_idx" ON "inv"."movimiento_linea"("producto_id");

-- CreateIndex
CREATE UNIQUE INDEX "traspaso_numero_key" ON "inv"."traspaso"("numero");

-- CreateIndex
CREATE INDEX "traspaso_estado_idx" ON "inv"."traspaso"("estado");

-- CreateIndex
CREATE INDEX "traspaso_linea_traspaso_id_idx" ON "inv"."traspaso_linea"("traspaso_id");

-- CreateIndex
CREATE INDEX "solicitud_ajuste_estado_idx" ON "inv"."solicitud_ajuste"("estado");

-- CreateIndex
CREATE INDEX "reserva_cv_linea_id_idx" ON "inv"."reserva"("cv_linea_id");

-- CreateIndex
CREATE INDEX "reserva_almacen_id_producto_id_estado_idx" ON "inv"."reserva"("almacen_id", "producto_id", "estado");

-- CreateIndex
CREATE INDEX "salida_estado_proximo_intento_en_idx" ON "notif"."salida"("estado", "proximo_intento_en");

-- CreateIndex
CREATE INDEX "bandeja_usuario_id_leida_en_idx" ON "notif"."bandeja"("usuario_id", "leida_en");

-- CreateIndex
CREATE UNIQUE INDEX "preferencia_usuario_id_tipo_evento_key" ON "notif"."preferencia"("usuario_id", "tipo_evento");

-- CreateIndex
CREATE UNIQUE INDEX "sla_politica_modalidad_prioridad_key" ON "tickets"."sla_politica"("modalidad", "prioridad");

-- CreateIndex
CREATE INDEX "sla_medicion_estado_vence_en_idx" ON "tickets"."sla_medicion"("estado", "vence_en");

-- CreateIndex
CREATE UNIQUE INDEX "sla_medicion_ticket_id_tipo_key" ON "tickets"."sla_medicion"("ticket_id", "tipo");

-- CreateIndex
CREATE INDEX "registro_tiempo_ticket_id_inicio_idx" ON "tickets"."registro_tiempo"("ticket_id", "inicio");

-- CreateIndex
CREATE INDEX "registro_tiempo_usuario_id_inicio_idx" ON "tickets"."registro_tiempo"("usuario_id", "inicio");

-- CreateIndex
CREATE UNIQUE INDEX "registro_tiempo_abierto_unico" ON "tickets"."registro_tiempo"("usuario_id") WHERE (fin IS NULL);

-- CreateIndex
CREATE INDEX "evento_contador_contador_id_ocurrido_en_idx" ON "tickets"."evento_contador"("contador_id", "ocurrido_en");

-- CreateIndex
CREATE INDEX "evento_contador_usuario_id_ocurrido_en_idx" ON "tickets"."evento_contador"("usuario_id", "ocurrido_en");

-- CreateIndex
CREATE INDEX "proyecto_cliente_id_idx" ON "tickets"."proyecto"("cliente_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_numero_key" ON "tickets"."ticket"("numero");

-- CreateIndex
CREATE INDEX "ticket_estado_idx" ON "tickets"."ticket"("estado");

-- CreateIndex
CREATE INDEX "ticket_cliente_id_idx" ON "tickets"."ticket"("cliente_id");

-- CreateIndex
CREATE INDEX "ticket_encargado_id_idx" ON "tickets"."ticket"("encargado_id");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_bolsa_ticket_id_prioridad_key" ON "tickets"."ticket_bolsa"("ticket_id", "prioridad");

-- CreateIndex
CREATE INDEX "subtarea_ticket_id_idx" ON "tickets"."subtarea"("ticket_id");

-- CreateIndex
CREATE INDEX "subtarea_asignado_id_idx" ON "tickets"."subtarea"("asignado_id");

-- CreateIndex
CREATE INDEX "comentario_ticket_id_creado_en_idx" ON "tickets"."comentario"("ticket_id", "creado_en");

-- CreateIndex
CREATE INDEX "adjunto_ticket_id_idx" ON "tickets"."adjunto"("ticket_id");

-- AddForeignKey
ALTER TABLE "auth"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "auth"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."horario_franja" ADD CONSTRAINT "horario_franja_horario_id_fkey" FOREIGN KEY ("horario_id") REFERENCES "core"."horario_oficina"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."feriado" ADD CONSTRAINT "feriado_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "core"."ciudad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."cliente_contacto" ADD CONSTRAINT "cliente_contacto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."producto" ADD CONSTRAINT "producto_tecnologia_id_fkey" FOREIGN KEY ("tecnologia_id") REFERENCES "core"."tecnologia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."producto" ADD CONSTRAINT "producto_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "core"."unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."ciudad" ADD CONSTRAINT "ciudad_horario_oficina_id_fkey" FOREIGN KEY ("horario_oficina_id") REFERENCES "core"."horario_oficina"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."usuario_rol" ADD CONSTRAINT "usuario_rol_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."usuario_rol" ADD CONSTRAINT "usuario_rol_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "core"."rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."usuario_rol" ADD CONSTRAINT "usuario_rol_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."grupo_entra_rol" ADD CONSTRAINT "grupo_entra_rol_rol_id_fkey" FOREIGN KEY ("rol_id") REFERENCES "core"."rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."grupo_entra_rol" ADD CONSTRAINT "grupo_entra_rol_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."permiso_excepcion" ADD CONSTRAINT "permiso_excepcion_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."permiso_excepcion" ADD CONSTRAINT "permiso_excepcion_otorgado_por_id_fkey" FOREIGN KEY ("otorgado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."parametro" ADD CONSTRAINT "parametro_actualizado_por_id_fkey" FOREIGN KEY ("actualizado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."usuario_perfil" ADD CONSTRAINT "usuario_perfil_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "auth"."user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "core"."usuario_perfil" ADD CONSTRAINT "usuario_perfil_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "core"."ciudad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."linea" ADD CONSTRAINT "linea_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cv"."version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."linea" ADD CONSTRAINT "linea_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "cv"."grupo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."linea" ADD CONSTRAINT "linea_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."linea" ADD CONSTRAINT "linea_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "core"."proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."linea" ADD CONSTRAINT "linea_tecnologia_id_fkey" FOREIGN KEY ("tecnologia_id") REFERENCES "core"."tecnologia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."linea" ADD CONSTRAINT "linea_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "core"."producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."linea" ADD CONSTRAINT "linea_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "core"."unidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."linea_serial" ADD CONSTRAINT "linea_serial_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "cv"."linea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."leasing_linea" ADD CONSTRAINT "leasing_linea_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cv"."version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."leasing_linea" ADD CONSTRAINT "leasing_linea_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "core"."proveedor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."leasing_linea" ADD CONSTRAINT "leasing_linea_tecnologia_id_fkey" FOREIGN KEY ("tecnologia_id") REFERENCES "core"."tecnologia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."numerador" ADD CONSTRAINT "numerador_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "core"."ciudad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."cv" ADD CONSTRAINT "cv_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "core"."ciudad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."cv" ADD CONSTRAINT "cv_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."cv" ADD CONSTRAINT "cv_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."version" ADD CONSTRAINT "version_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cv"."cv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."version" ADD CONSTRAINT "version_preventa_id_fkey" FOREIGN KEY ("preventa_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."version" ADD CONSTRAINT "version_postventa_id_fkey" FOREIGN KEY ("postventa_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."version" ADD CONSTRAINT "version_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."version" ADD CONSTRAINT "version_linea_principal_id_fkey" FOREIGN KEY ("linea_principal_id") REFERENCES "core"."tecnologia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."version" ADD CONSTRAINT "version_tipo_servicio_id_fkey" FOREIGN KEY ("tipo_servicio_id") REFERENCES "core"."tipo_servicio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."version" ADD CONSTRAINT "version_cliente_final_id_fkey" FOREIGN KEY ("cliente_final_id") REFERENCES "core"."cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."version_vendedor" ADD CONSTRAINT "version_vendedor_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cv"."version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."version_vendedor" ADD CONSTRAINT "version_vendedor_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."grupo" ADD CONSTRAINT "grupo_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cv"."version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."solicitud_aprobacion" ADD CONSTRAINT "solicitud_aprobacion_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cv"."version"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."solicitud_aprobacion" ADD CONSTRAINT "solicitud_aprobacion_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."solicitud_aprobacion" ADD CONSTRAINT "solicitud_aprobacion_decidida_por_id_fkey" FOREIGN KEY ("decidida_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."adjunto" ADD CONSTRAINT "adjunto_cv_id_fkey" FOREIGN KEY ("cv_id") REFERENCES "cv"."cv"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."adjunto" ADD CONSTRAINT "adjunto_version_id_fkey" FOREIGN KEY ("version_id") REFERENCES "cv"."version"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv"."adjunto" ADD CONSTRAINT "adjunto_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fx"."tipo_cambio" ADD CONSTRAINT "tipo_cambio_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."bolsa" ADD CONSTRAINT "bolsa_cv_linea_id_fkey" FOREIGN KEY ("cv_linea_id") REFERENCES "cv"."linea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."bolsa" ADD CONSTRAINT "bolsa_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."bolsa" ADD CONSTRAINT "bolsa_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "tickets"."proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."bolsa_area" ADD CONSTRAINT "bolsa_area_bolsa_id_fkey" FOREIGN KEY ("bolsa_id") REFERENCES "horas"."bolsa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."bolsa_area" ADD CONSTRAINT "bolsa_area_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."movimiento" ADD CONSTRAINT "movimiento_bolsa_id_fkey" FOREIGN KEY ("bolsa_id") REFERENCES "horas"."bolsa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."movimiento" ADD CONSTRAINT "movimiento_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."movimiento" ADD CONSTRAINT "movimiento_revierte_id_fkey" FOREIGN KEY ("revierte_id") REFERENCES "horas"."movimiento"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."movimiento" ADD CONSTRAINT "movimiento_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."pendiente_sin_bolsa" ADD CONSTRAINT "pendiente_sin_bolsa_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."pendiente_sin_bolsa" ADD CONSTRAINT "pendiente_sin_bolsa_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "horas"."pendiente_sin_bolsa" ADD CONSTRAINT "pendiente_sin_bolsa_bolsa_aplicada_id_fkey" FOREIGN KEY ("bolsa_aplicada_id") REFERENCES "horas"."bolsa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."almacen" ADD CONSTRAINT "almacen_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "core"."ciudad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."stock" ADD CONSTRAINT "stock_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "inv"."almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."stock" ADD CONSTRAINT "stock_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "core"."producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."unidad_serial" ADD CONSTRAINT "unidad_serial_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "core"."producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."unidad_serial" ADD CONSTRAINT "unidad_serial_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "inv"."almacen"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento" ADD CONSTRAINT "movimiento_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "inv"."almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento" ADD CONSTRAINT "movimiento_cv_linea_id_fkey" FOREIGN KEY ("cv_linea_id") REFERENCES "cv"."linea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento" ADD CONSTRAINT "movimiento_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento" ADD CONSTRAINT "movimiento_traspaso_id_fkey" FOREIGN KEY ("traspaso_id") REFERENCES "inv"."traspaso"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento" ADD CONSTRAINT "movimiento_solicitud_ajuste_id_fkey" FOREIGN KEY ("solicitud_ajuste_id") REFERENCES "inv"."solicitud_ajuste"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento" ADD CONSTRAINT "movimiento_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento_linea" ADD CONSTRAINT "movimiento_linea_movimiento_id_fkey" FOREIGN KEY ("movimiento_id") REFERENCES "inv"."movimiento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento_linea" ADD CONSTRAINT "movimiento_linea_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "core"."producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."movimiento_linea" ADD CONSTRAINT "movimiento_linea_unidad_serial_id_fkey" FOREIGN KEY ("unidad_serial_id") REFERENCES "inv"."unidad_serial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."traspaso" ADD CONSTRAINT "traspaso_almacen_origen_id_fkey" FOREIGN KEY ("almacen_origen_id") REFERENCES "inv"."almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."traspaso" ADD CONSTRAINT "traspaso_almacen_destino_id_fkey" FOREIGN KEY ("almacen_destino_id") REFERENCES "inv"."almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."traspaso" ADD CONSTRAINT "traspaso_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."traspaso" ADD CONSTRAINT "traspaso_enviado_por_id_fkey" FOREIGN KEY ("enviado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."traspaso" ADD CONSTRAINT "traspaso_recibido_por_id_fkey" FOREIGN KEY ("recibido_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."traspaso_linea" ADD CONSTRAINT "traspaso_linea_traspaso_id_fkey" FOREIGN KEY ("traspaso_id") REFERENCES "inv"."traspaso"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."traspaso_linea" ADD CONSTRAINT "traspaso_linea_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "core"."producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."traspaso_linea" ADD CONSTRAINT "traspaso_linea_unidad_serial_id_fkey" FOREIGN KEY ("unidad_serial_id") REFERENCES "inv"."unidad_serial"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."solicitud_ajuste" ADD CONSTRAINT "solicitud_ajuste_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "inv"."almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."solicitud_ajuste" ADD CONSTRAINT "solicitud_ajuste_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."solicitud_ajuste" ADD CONSTRAINT "solicitud_ajuste_solicitado_por_id_fkey" FOREIGN KEY ("solicitado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."solicitud_ajuste" ADD CONSTRAINT "solicitud_ajuste_decidido_por_id_fkey" FOREIGN KEY ("decidido_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."reserva" ADD CONSTRAINT "reserva_cv_linea_id_fkey" FOREIGN KEY ("cv_linea_id") REFERENCES "cv"."linea"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."reserva" ADD CONSTRAINT "reserva_almacen_id_fkey" FOREIGN KEY ("almacen_id") REFERENCES "inv"."almacen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inv"."reserva" ADD CONSTRAINT "reserva_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "core"."producto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notif"."bandeja" ADD CONSTRAINT "bandeja_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notif"."preferencia" ADD CONSTRAINT "preferencia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."sla_medicion" ADD CONSTRAINT "sla_medicion_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."sla_medicion" ADD CONSTRAINT "sla_medicion_politica_id_fkey" FOREIGN KEY ("politica_id") REFERENCES "tickets"."sla_politica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."registro_tiempo" ADD CONSTRAINT "registro_tiempo_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."registro_tiempo" ADD CONSTRAINT "registro_tiempo_subtarea_id_fkey" FOREIGN KEY ("subtarea_id") REFERENCES "tickets"."subtarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."registro_tiempo" ADD CONSTRAINT "registro_tiempo_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."evento_contador" ADD CONSTRAINT "evento_contador_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."evento_contador" ADD CONSTRAINT "evento_contador_subtarea_id_fkey" FOREIGN KEY ("subtarea_id") REFERENCES "tickets"."subtarea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."evento_contador" ADD CONSTRAINT "evento_contador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."proyecto" ADD CONSTRAINT "proyecto_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."proyecto" ADD CONSTRAINT "proyecto_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."proyecto_area" ADD CONSTRAINT "proyecto_area_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "tickets"."proyecto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."proyecto_area" ADD CONSTRAINT "proyecto_area_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."ticket" ADD CONSTRAINT "ticket_proyecto_id_fkey" FOREIGN KEY ("proyecto_id") REFERENCES "tickets"."proyecto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."ticket" ADD CONSTRAINT "ticket_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "core"."cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."ticket" ADD CONSTRAINT "ticket_ciudad_id_fkey" FOREIGN KEY ("ciudad_id") REFERENCES "core"."ciudad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."ticket" ADD CONSTRAINT "ticket_encargado_id_fkey" FOREIGN KEY ("encargado_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."ticket" ADD CONSTRAINT "ticket_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."ticket_area" ADD CONSTRAINT "ticket_area_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."ticket_area" ADD CONSTRAINT "ticket_area_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "core"."area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."ticket_bolsa" ADD CONSTRAINT "ticket_bolsa_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."ticket_bolsa" ADD CONSTRAINT "ticket_bolsa_bolsa_id_fkey" FOREIGN KEY ("bolsa_id") REFERENCES "horas"."bolsa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."subtarea" ADD CONSTRAINT "subtarea_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."subtarea" ADD CONSTRAINT "subtarea_asignado_id_fkey" FOREIGN KEY ("asignado_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."subtarea" ADD CONSTRAINT "subtarea_creado_por_id_fkey" FOREIGN KEY ("creado_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."comentario" ADD CONSTRAINT "comentario_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."comentario" ADD CONSTRAINT "comentario_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."adjunto" ADD CONSTRAINT "adjunto_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"."ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets"."adjunto" ADD CONSTRAINT "adjunto_subido_por_id_fkey" FOREIGN KEY ("subido_por_id") REFERENCES "core"."usuario_perfil"("usuario_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ===== SQL adicional (fuente: prisma/sql/*.sql, AGENTS.md §4) =====

-- prisma/sql/extensions.sql
-- Extensiones que exigen las restricciones de la migración inicial (btree_gist para EXCLUDE con igualdad).

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- prisma/sql/core.sql
-- Restricciones del esquema core que Prisma no expresa: rangos de franjas y unicidad con columnas nulas.

ALTER TABLE core.horario_franja
  ADD CONSTRAINT horario_franja_dia_semana_ck CHECK (dia_semana BETWEEN 1 AND 7),
  ADD CONSTRAINT horario_franja_rango_ck CHECK (minuto_inicio >= 0 AND minuto_inicio < minuto_fin AND minuto_fin <= 1440);

-- POR QUÉ: area_id y ciudad_id nulos significan "sin área" o "nacional"; con NULLS DISTINCT se podrían duplicar.
DROP INDEX core.usuario_rol_unico;
CREATE UNIQUE INDEX usuario_rol_unico ON core.usuario_rol (usuario_id, rol_id, area_id) NULLS NOT DISTINCT;

DROP INDEX core.grupo_entra_rol_unico;
CREATE UNIQUE INDEX grupo_entra_rol_unico ON core.grupo_entra_rol (grupo_entra_id, rol_id, area_id) NULLS NOT DISTINCT;

DROP INDEX core.feriado_unico;
CREATE UNIQUE INDEX feriado_unico ON core.feriado (fecha, ciudad_id) NULLS NOT DISTINCT;

-- prisma/sql/cv.sql
-- Restricciones del esquema cv: versiones inmutables fuera de BORRADOR (ADR-11) y reglas de línea (AGENTS.md §2.1–2.2).

ALTER TABLE cv.linea
  ADD CONSTRAINT linea_area_obligatoria_ck CHECK (tipo_linea <> 'ITEM' OR area_id IS NOT NULL),
  ADD CONSTRAINT linea_factor_sin_costo_ck CHECK (factor IS NULL OR costo_unit_usd > 0);

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

-- prisma/sql/hours.sql
-- Restricciones del esquema horas: saldo nunca negativo y libro mayor inmutable (AGENTS.md §2.4, ADR-03).

ALTER TABLE horas.bolsa
  ADD CONSTRAINT bolsa_saldo_no_negativo_ck CHECK (saldo_minutos >= 0);

ALTER TABLE horas.pendiente_sin_bolsa
  ADD CONSTRAINT pendiente_minutos_ck CHECK (minutos_dentro >= 0 AND minutos_fuera >= 0);

CREATE FUNCTION horas.movimiento_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'horas.movimiento es inmutable; registra un movimiento nuevo (REVERSO o AJUSTE)'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER movimiento_inmutable BEFORE UPDATE OR DELETE ON horas.movimiento
  FOR EACH ROW EXECUTE FUNCTION horas.movimiento_inmutable();

-- prisma/sql/tickets.sql
-- Restricciones del esquema tickets: registros de tiempo sin solapes por persona y valores positivos (AGENTS.md §2.6).

-- REGLA: los registros de una misma persona no se solapan; fin nulo = abierto, solapa con todo lo posterior.
ALTER TABLE tickets.registro_tiempo
  ADD CONSTRAINT registro_tiempo_rango_ck CHECK (fin IS NULL OR fin > inicio),
  ADD CONSTRAINT registro_tiempo_sin_solape_ex EXCLUDE USING gist (
    usuario_id WITH =,
    tstzrange(inicio, fin, '[)') WITH &&
  );

ALTER TABLE tickets.ticket_bolsa
  ADD CONSTRAINT ticket_bolsa_prioridad_ck CHECK (prioridad >= 1);

ALTER TABLE tickets.sla_politica
  ADD CONSTRAINT sla_politica_minutos_ck CHECK (minutos_primera_respuesta > 0 AND minutos_resolucion > 0);

-- prisma/sql/inventory.sql
-- Restricciones del esquema inv: stock nunca negativo y libro de movimientos inmutable (AGENTS.md §2.8, ADR-03).

ALTER TABLE inv.stock
  ADD CONSTRAINT stock_cantidad_ck CHECK (cantidad >= 0 AND cantidad_reservada >= 0);

ALTER TABLE inv.reserva
  ADD CONSTRAINT reserva_cantidad_ck CHECK (cantidad > 0 AND cantidad_consumida >= 0 AND cantidad_consumida <= cantidad);

ALTER TABLE inv.traspaso
  ADD CONSTRAINT traspaso_almacenes_distintos_ck CHECK (almacen_origen_id <> almacen_destino_id);

CREATE FUNCTION inv.movimiento_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% es inmutable; registra un movimiento nuevo (AJUSTE o DEVOLUCION)', TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER movimiento_inmutable BEFORE UPDATE OR DELETE ON inv.movimiento
  FOR EACH ROW EXECUTE FUNCTION inv.movimiento_inmutable();
CREATE TRIGGER movimiento_inmutable BEFORE UPDATE OR DELETE ON inv.movimiento_linea
  FOR EACH ROW EXECUTE FUNCTION inv.movimiento_inmutable();

-- prisma/sql/audit.sql
-- Restricciones del esquema audit: los eventos de auditoría no se modifican ni se borran (ADR-14).

CREATE FUNCTION audit.evento_inmutable() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit.evento es inmutable'
    USING ERRCODE = 'check_violation';
END $$;

CREATE TRIGGER evento_inmutable BEFORE UPDATE OR DELETE ON audit.evento
  FOR EACH ROW EXECUTE FUNCTION audit.evento_inmutable();
