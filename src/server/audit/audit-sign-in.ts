// src/server/audit/audit-sign-in.ts
// Deja en audit.evento cada inicio de sesión y cada intento fallido con contraseña (ADR-14; ISO 27001 A.8.15).
// Lo llaman los hooks de Better Auth en src/server/auth.ts.
import { recordAudit } from "@/server/audit/record-audit";
import { prisma, type Tx } from "@/server/db";

const MAX_EMAIL_LENGTH = 254;

type SessionRecord = { id: string; userId: string };
type HookContext = { path?: string } | null | undefined;
type Db = Pick<Tx, "auditEvent">;

// REGLA: sin rastro no hay sesión; si el evento no se guarda, el inicio de sesión falla con él.
export async function auditSignIn(
  session: SessionRecord,
  ctx: HookContext,
  db: Db = prisma,
): Promise<void> {
  await recordAudit(db, {
    actorId: session.userId,
    entity: "auth.user",
    entityId: session.userId,
    action: "INICIAR_SESION",
    after: {
      method: ctx?.path === "/sign-in/email" ? "CONTRASENA" : "ENTRA",
      sessionId: session.id,
    },
  });
}

// POR QUÉ: el correo identifica el intento aunque no exista la cuenta; se recorta para que un cuerpo enorme no
// llene la auditoría (el límite de intentos por IP acota cuántos llegan).
export async function auditFailedSignIn(
  email: unknown,
  reason: string,
  db: Db = prisma,
): Promise<void> {
  const attempted =
    typeof email === "string"
      ? email.trim().toLowerCase().slice(0, MAX_EMAIL_LENGTH)
      : "";
  await recordAudit(db, {
    actorId: null,
    entity: "auth.intento",
    entityId: attempted || "(sin correo)",
    action: "INICIO_FALLIDO",
    after: { reason },
  });
}
