// src/server/files/sharepoint-file-store.ts
// Adjuntos en una biblioteca de SharePoint por Microsoft Graph con credenciales de aplicación (ADR-16). Sin SDK:
// cuatro llamadas HTTP no justifican la dependencia (AGENTS.md §0.14). Permiso: Sites.Selected con escritura
// solo sobre el sitio de Kraken.
import { type FileStore, FileStoreError, type StoredFile } from "./file-store";

export type SharePointConfig = {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  driveId: string;
  folder: string;
};

const GRAPH_URL = "https://graph.microsoft.com/v1.0";
const SIMPLE_UPLOAD_MAX = 4 * 1024 * 1024;
// POR QUÉ: Graph exige trozos múltiplos de 320 KiB en una sesión de subida; 5 MiB = 16 × 320 KiB.
const CHUNK_BYTES = 16 * 320 * 1024;
const TOKEN_MARGIN_MS = 60_000;

export class SharePointFileStore implements FileStore {
  readonly name = "sharepoint" as const;
  private token: { value: string; expiresAt: number } | null = null;

  constructor(private readonly config: SharePointConfig) {}

  // POR QUÉ: storagePath es el id del elemento en la biblioteca; renombrar o mover la carpeta no rompe el enlace.
  async put(
    path: string,
    data: Uint8Array,
    mimeType: string,
  ): Promise<StoredFile> {
    const item = `${GRAPH_URL}/drives/${this.config.driveId}/root:/${encodePath(`${this.config.folder}/${path}`)}`;
    const uploaded =
      data.byteLength <= SIMPLE_UPLOAD_MAX
        ? await this.call(`${item}:/content`, {
            method: "PUT",
            body: Buffer.from(data),
            headers: { "content-type": mimeType },
          })
        : await this.uploadInChunks(`${item}:/createUploadSession`, data);
    const { id } = (await uploaded.json()) as { id: string };
    return { storagePath: id };
  }

  async get(storagePath: string): Promise<Uint8Array> {
    const response = await this.call(`${this.itemUrl(storagePath)}/content`);
    return new Uint8Array(await response.arrayBuffer());
  }

  async remove(storagePath: string): Promise<void> {
    await this.call(this.itemUrl(storagePath), { method: "DELETE" }, [404]);
  }

  private itemUrl(itemId: string): string {
    return `${GRAPH_URL}/drives/${this.config.driveId}/items/${encodeURIComponent(itemId)}`;
  }

  private async uploadInChunks(
    sessionUrl: string,
    data: Uint8Array,
  ): Promise<Response> {
    const session = await this.call(sessionUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        item: { "@microsoft.graph.conflictBehavior": "rename" },
      }),
    });
    const { uploadUrl } = (await session.json()) as { uploadUrl: string };
    let last: Response | null = null;
    for (let start = 0; start < data.byteLength; start += CHUNK_BYTES) {
      const end = Math.min(start + CHUNK_BYTES, data.byteLength);
      // TRAMPA: la URL de la sesión ya está autorizada; Graph rechaza el encabezado Authorization en ella.
      last = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "content-range": `bytes ${start}-${end - 1}/${data.byteLength}`,
        },
        body: Buffer.from(data.subarray(start, end)),
      });
      if (!last.ok && last.status !== 202)
        throw await toError("La subida a SharePoint", last);
    }
    if (!last) throw new FileStoreError("El archivo está vacío.");
    return last;
  }

  private async call(
    url: string,
    init: RequestInit = {},
    okStatuses: number[] = [],
  ): Promise<Response> {
    const response = await fetch(url, {
      ...init,
      headers: {
        ...init.headers,
        authorization: `Bearer ${await this.accessToken()}`,
      },
    });
    if (response.status === 401) this.token = null;
    if (!response.ok && !okStatuses.includes(response.status))
      throw await toError("SharePoint", response);
    return response;
  }

  private async accessToken(): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + TOKEN_MARGIN_MS)
      return this.token.value;
    const { tenantId, clientId, clientSecret } = this.config;
    const response = await fetch(
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
    if (!response.ok) throw await toError("El token de SharePoint", response);
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

function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function toError(
  what: string,
  response: Response,
): Promise<FileStoreError> {
  const detail = await response.text().catch(() => "");
  return new FileStoreError(
    `${what} respondió ${response.status}: ${detail.slice(0, 200)}`,
  );
}
