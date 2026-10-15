// src/server/mail/mail-sender.ts
// Contrato de envío de correo (Adapter, AGENTS.md §9 L): Graph en producción, Mailpit en desarrollo.

export type MailMessage = { to: string; subject: string; html: string };

export interface MailSender {
  readonly name: string;
  send(message: MailMessage): Promise<void>;
}

// POR QUÉ: un error permanente (destinatario inválido, permiso faltante) no mejora reintentando.
export class MailSendError extends Error {
  constructor(
    message: string,
    readonly isTransient: boolean,
  ) {
    super(message);
    this.name = "MailSendError";
  }
}

// REGLA: 408, 429 y 5xx son pasajeros; el resto de 4xx no se reintenta.
export function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

// POR QUÉ: un fallo de red (DNS, conexión, tiempo agotado) es pasajero; se reintenta.
export async function fetchOrTransient(
  service: string,
  url: string,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new MailSendError(`${service} no responde: ${detail}`, true);
  }
}

export async function failFromResponse(
  step: string,
  response: Response,
): Promise<never> {
  const detail = (await response.text()).slice(0, 300);
  throw new MailSendError(
    `${step} respondió ${response.status}: ${detail}`,
    isTransientStatus(response.status),
  );
}
