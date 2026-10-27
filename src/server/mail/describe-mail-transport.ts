// src/server/mail/describe-mail-transport.ts
// Por dónde sale el correo en este entorno, en palabras, para la pantalla de administración. Usa la misma
// regla que select-mail-sender.ts sin crear el adaptador.
import { isStagingEnv } from "@/server/app-env";

type Env = Record<string, string | undefined>;

export type MailTransport = { name: string; detail: string; ready: boolean };

export function describeMailTransport(env: Env = process.env): MailTransport {
  if (isStagingEnv(env) && env.MAILPIT_URL)
    return {
      name: "Mailpit (staging)",
      detail:
        "Entorno de pruebas: los correos no llegan a nadie; se ven en la interfaz de Mailpit del nodo de staging.",
      ready: true,
    };
  const graphReady =
    !!env.ENTRA_TENANT_ID &&
    !!env.GRAPH_CLIENT_ID &&
    !!env.GRAPH_CLIENT_SECRET &&
    !!env.MAIL_SENDER;
  if (graphReady)
    return {
      name: "Microsoft Graph",
      detail: `Desde el buzón ${env.MAIL_SENDER}.`,
      ready: true,
    };
  if (env.NODE_ENV !== "production")
    return {
      name: "Mailpit (desarrollo)",
      detail: `Los correos no salen de esta máquina: se ven en ${env.MAILPIT_URL ?? "http://localhost:8025"}.`,
      ready: true,
    };
  return {
    name: "Sin configurar",
    detail:
      "Faltan GRAPH_CLIENT_ID, GRAPH_CLIENT_SECRET o MAIL_SENDER: los correos esperan en la cola.",
    ready: false,
  };
}
