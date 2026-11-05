-- Último recordatorio de una solicitud de aprobación pendiente (job approvals.reminder, AGENTS.md §7).
ALTER TABLE "cv"."solicitud_aprobacion" ADD COLUMN "recordado_en" TIMESTAMPTZ;
