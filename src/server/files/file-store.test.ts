// src/server/files/file-store.test.ts
// Adaptadores del FileStore (ADR-16): elección por entorno, carpeta local sin salir de su raíz y SharePoint por
// Graph con subida simple, por sesión en trozos, lectura y borrado.
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileConflictError, FileStoreError } from "./file-store";
import { LocalFileStore } from "./local-file-store";
import { selectFileStore } from "./select-file-store";
import { SharePointFileStore } from "./sharepoint-file-store";

const SHAREPOINT_ENV = {
  ENTRA_TENANT_ID: "t",
  SHAREPOINT_CLIENT_ID: "c",
  SHAREPOINT_CLIENT_SECRET: "s",
  SHAREPOINT_DRIVE_ID: "d",
};

describe("selectFileStore", () => {
  it("prefiere SharePoint, luego FILES_ROOT y en desarrollo una carpeta local", () => {
    expect(selectFileStore(SHAREPOINT_ENV)?.name).toBe("sharepoint");
    expect(
      selectFileStore({ FILES_ROOT: "/mnt/nas", NODE_ENV: "production" })?.name,
    ).toBe("local");
    expect(selectFileStore({ NODE_ENV: "development" })?.name).toBe("local");
  });

  it("en producción sin configuración deshabilita los adjuntos", () => {
    expect(selectFileStore({ NODE_ENV: "production" })).toBeNull();
  });
});

describe("LocalFileStore", () => {
  it("guarda, lee y borra dentro de su raíz, y rechaza rutas que salen de ella", async () => {
    const root = await mkdtemp(join(tmpdir(), "kraken-files-"));
    const store = new LocalFileStore(root);
    const { storagePath } = await store.put(
      "tickets/1/a.txt",
      new TextEncoder().encode("hola"),
      "text/plain",
    );
    expect(new TextDecoder().decode(await store.get(storagePath))).toBe("hola");
    await store.remove(storagePath);
    await expect(store.get(storagePath)).rejects.toThrow();
    await expect(
      store.put("../fuera.txt", new Uint8Array([1]), "text/plain"),
    ).rejects.toThrow(FileStoreError);
    await rm(root, { recursive: true, force: true });
  });

  it("no pisa un archivo que ya existe", async () => {
    const root = await mkdtemp(join(tmpdir(), "kraken-files-"));
    const store = new LocalFileStore(root);
    await store.put("doc/a.txt", new Uint8Array([1]), "text/plain");
    await expect(
      store.put("doc/a.txt", new Uint8Array([2]), "text/plain"),
    ).rejects.toThrow(FileConflictError);
    expect(Array.from(await store.get("doc/a.txt"))).toEqual([1]);
    await rm(root, { recursive: true, force: true });
  });
});

describe("SharePointFileStore", () => {
  afterEach(() => vi.unstubAllGlobals());

  const store = () =>
    new SharePointFileStore({
      tenantId: "t",
      clientId: "c",
      clientSecret: "s",
      driveId: "d",
      folder: "Kraken",
    });

  function mockFetch(handler: (url: string, init?: RequestInit) => Response) {
    const calls: { url: string; init?: RequestInit }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        if (url.includes("login.microsoftonline.com"))
          return Response.json({ access_token: "tok", expires_in: 3600 });
        return handler(url, init);
      }),
    );
    return calls;
  }

  it("sube un archivo chico en una llamada y guarda el id del elemento", async () => {
    const calls = mockFetch(() => Response.json({ id: "item-1" }));
    const stored = await store().put(
      "tickets/7/acta final.pdf",
      new Uint8Array(10),
      "application/pdf",
    );
    expect(stored).toEqual({ storagePath: "item-1" });
    const upload = calls.find((c) => c.init?.method === "PUT");
    expect(upload?.url).toContain(
      "/drives/d/root:/Kraken/tickets/7/acta%20final.pdf:/content",
    );
    expect(new Headers(upload?.init?.headers).get("authorization")).toBe(
      "Bearer tok",
    );
  });

  it("sube un archivo grande por sesión en trozos de 5 MiB, sin el token en la URL de la sesión", async () => {
    const calls = mockFetch((url) =>
      url.endsWith("createUploadSession")
        ? Response.json({ uploadUrl: "https://upload.example/s" })
        : url.startsWith("https://upload.example")
          ? Response.json({ id: "item-2" }, { status: 202 })
          : new Response(null, { status: 500 }),
    );
    const stored = await store().put(
      "tickets/7/backup.zip",
      new Uint8Array(12 * 1024 * 1024),
      "application/zip",
    );
    expect(stored).toEqual({ storagePath: "item-2" });
    const chunks = calls.filter((c) =>
      c.url.startsWith("https://upload.example"),
    );
    expect(chunks).toHaveLength(3);
    expect(new Headers(chunks[0].init?.headers).get("content-range")).toBe(
      `bytes 0-5242879/${12 * 1024 * 1024}`,
    );
    expect(new Headers(chunks[0].init?.headers).has("authorization")).toBe(
      false,
    );
  });

  it("lee el contenido, tolera borrar algo que ya no existe y reporta los errores", async () => {
    mockFetch((url, init) =>
      init?.method === "DELETE"
        ? new Response(null, { status: 404 })
        : url.endsWith("/content")
          ? new Response(new Uint8Array([1, 2, 3]))
          : new Response("boom", { status: 503 }),
    );
    expect(Array.from(await store().get("item-1"))).toEqual([1, 2, 3]);
    await expect(store().remove("item-1")).resolves.toBeUndefined();
  });

  it("pide fallar si el nombre existe y traduce el 409 a FileConflictError", async () => {
    const calls = mockFetch(() => new Response("existe", { status: 409 }));
    await expect(
      store().put("doc/a.pdf", new Uint8Array(10), "application/pdf"),
    ).rejects.toThrow(FileConflictError);
    expect(calls.find((c) => c.init?.method === "PUT")?.url).toContain(
      "conflictBehavior=fail",
    );
  });

  it("convierte una respuesta fallida en FileStoreError", async () => {
    mockFetch(() => new Response("sin permiso", { status: 403 }));
    await expect(store().get("item-1")).rejects.toThrow(FileStoreError);
  });
});
