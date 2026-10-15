// src/server/mail/graph-mail-sender.ts
// Envío por Microsoft Graph con credenciales de aplicación desde el buzón de servicio (ADR-08). Sin SDK:
// dos llamadas HTTP no justifican la dependencia (AGENTS.md §0.14).
import {
  failFromResponse,
  fetchOrTransient,
  type MailMessage,
  type MailSender,
} from "./mail-sender";

export type GraphConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  sender: string;
};

type Token = { value: string; expiresAt: number };

const GRAPH_URL = "https://graph.microsoft.com/v1.0";
const TOKEN_MARGIN_MS = 60_000;

export class GraphMailSender implements MailSender {
  readonly name = "graph";
  private token: Token | null = null;

  constructor(private readonly config: GraphConfig) {}

  async send({ to, subject, html }: MailMessage): Promise<void> {
    const sender = encodeURIComponent(this.config.sender);
    const response = await fetchOrTransient(
      "Graph",
      `${GRAPH_URL}/users/${sender}/sendMail`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${await this.accessToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          message: {
            subject,
            body: { contentType: "HTML", content: html },
            toRecipients: [{ emailAddress: { address: to } }],
          },
          saveToSentItems: false,
        }),
      },
    );
    // POR QUÉ: un token revocado se descarta; el reintento pide uno nuevo.
    if (response.status === 401) this.token = null;
    if (!response.ok) await failFromResponse("Graph sendMail", response);
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + TOKEN_MARGIN_MS)
      return this.token.value;
    const { tenantId, clientId, clientSecret } = this.config;
    const response = await fetchOrTransient(
      "Entra ID",
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
      {
        method: "POST",
        body: new URLSearchParams({
          grant_type: "client_credentials",
          client_id: clientId,
          client_secret: clientSecret,
          scope: "https://graph.microsoft.com/.default",
        }),
      },
    );
    if (!response.ok) await failFromResponse("El token de Graph", response);
    const data = (await response.json()) as {
      access_token: string;
      expires_in: number;
    };
    this.token = {
      value: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return this.token.value;
  }
}
