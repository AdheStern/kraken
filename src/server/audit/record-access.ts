// src/server/audit/record-access.ts
// Deja en audit.evento quién descargó o exportó qué (ADR-14; ISO 27001 A.8.12 y A.8.15). Se llama en los route
// handlers de descarga después de la authz y antes de entregar el archivo.
import { recordAudit } from "@/server/audit/record-audit";
import { prisma, type Tx } from "@/server/db";

type AccessEntry = {
  actorId: string;
  entity: string;
  entityId: string;
  action: "DESCARGAR" | "EXPORTAR";
  detail?: unknown;
};

// REGLA: sin rastro no hay descarga; si el evento no se guarda, la descarga falla con él.
export async function recordAccess(
  entry: AccessEntry,
  db: Pick<Tx, "auditEvent"> = prisma,
): Promise<void> {
  await recordAudit(db, {
    actorId: entry.actorId,
    entity: entry.entity,
    entityId: entry.entityId,
    action: entry.action,
    after: entry.detail,
  });
}
