// src/server/audit/record-audit.ts
// Registra un evento de auditoría (ADR-14): quién, qué entidad, qué acción, antes y después, IP y requestId.
// Se llama dentro de la transacción de la action, para que el cambio y su rastro se confirmen juntos.
import { headers } from "next/headers";
import type { Prisma } from "@/generated/prisma/client";
import { clientIpFrom, trustedProxiesFromEnv } from "@/server/client-ip";
import type { Tx } from "@/server/db";

export type AuditEntry = {
  actorId: string | null;
  entity: string;
  entityId: string;
  action: string;
  before?: unknown;
  after?: unknown;
};

export async function recordAudit(
  tx: Pick<Tx, "auditEvent">,
  entry: AuditEntry,
): Promise<void> {
  const origin = await requestOrigin();
  await tx.auditEvent.create({
    data: {
      actorId: entry.actorId,
      entity: entry.entity,
      entityId: entry.entityId,
      action: entry.action,
      before: toJson(entry.before),
      after: toJson(entry.after),
      ...origin,
    },
  });
}

// POR QUÉ: fuera de una petición (worker, inicio de sesión por hooks) headers() lanza; el evento va sin origen.
async function requestOrigin() {
  try {
    const h = await headers();
    return {
      ip:
        clientIpFrom(h.get("x-forwarded-for"), trustedProxiesFromEnv()) ??
        h.get("x-real-ip"),
      requestId: h.get("x-request-id"),
    };
  } catch {
    return { ip: null, requestId: null };
  }
}

// TRAMPA: Decimal y Date no son JSON; se guardan como texto, tal como se verían en pantalla.
function toJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
