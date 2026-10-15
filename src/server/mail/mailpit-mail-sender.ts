// src/server/mail/mailpit-mail-sender.ts
// Envío a Mailpit, el correo falso del Compose de desarrollo: los mensajes se ven en http://localhost:8025.
import {
  failFromResponse,
  fetchOrTransient,
  type MailMessage,
  type MailSender,
} from "./mail-sender";

const FROM = { Email: "kraken@dima.local", Name: "Kraken by DIMA" };

export class MailpitMailSender implements MailSender {
  readonly name = "mailpit";

  constructor(private readonly baseUrl: string) {}

  async send({ to, subject, html }: MailMessage): Promise<void> {
    const response = await fetchOrTransient(
      "Mailpit",
      `${this.baseUrl}/api/v1/send`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          From: FROM,
          To: [{ Email: to }],
          Subject: subject,
          HTML: html,
        }),
      },
    );
    if (!response.ok) await failFromResponse("Mailpit", response);
  }
}
