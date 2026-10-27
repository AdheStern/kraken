// src/server/mail/select-mail-sender.ts
// Elige el adaptador de correo según el entorno: Mailpit en staging si MAILPIT_URL está definido; si no, Graph si
// está configurado, y Mailpit solo fuera de producción.
import { isStagingEnv } from "@/server/app-env";
import { GraphMailSender } from "./graph-mail-sender";
import type { MailSender } from "./mail-sender";
import { MailpitMailSender } from "./mailpit-mail-sender";

type Env = Record<string, string | undefined>;

// REGLA: en producción sin Graph el worker no arranca; un aviso nunca se descarta en silencio (ADR-08).
export function selectMailSender(env: Env = process.env): MailSender {
  // POR QUÉ: staging tiene usuarios reales de Entra; con Mailpit ningún aviso de prueba les llega aunque se copie Graph.
  if (isStagingEnv(env) && env.MAILPIT_URL)
    return new MailpitMailSender(env.MAILPIT_URL);
  const tenantId = env.ENTRA_TENANT_ID;
  const clientId = env.GRAPH_CLIENT_ID;
  const clientSecret = env.GRAPH_CLIENT_SECRET;
  const sender = env.MAIL_SENDER;
  if (tenantId && clientId && clientSecret && sender)
    return new GraphMailSender({ tenantId, clientId, clientSecret, sender });
  if (env.NODE_ENV !== "production")
    return new MailpitMailSender(env.MAILPIT_URL ?? "http://localhost:8025");
  throw new Error(
    "Faltan ENTRA_TENANT_ID, GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET o MAIL_SENDER para enviar correo.",
  );
}
