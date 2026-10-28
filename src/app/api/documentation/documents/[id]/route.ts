// src/app/api/documentation/documents/[id]/route.ts
// Descarga de un documento de un proyecto de documentación con authz (AGENTS.md §7, §2.10).
import { NextResponse } from "next/server";
import { z } from "zod";
import { scopeDocProjectQuery } from "@/server/authz/scope-doc-project-query";
import { prisma } from "@/server/db";
import { safeContentType } from "@/server/files/safe-content-type";
import { selectFileStore } from "@/server/files/select-file-store";
import { log } from "@/server/log";
import { getSessionUser } from "@/server/session";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/documentation/documents/[id]">,
) {
  const user = await getSessionUser();
  if (!user)
    return new NextResponse("Inicia sesión para descargar.", { status: 401 });
  const { id } = await params;
  const document = z.uuid().safeParse(id).success
    ? await prisma.docDocument.findFirst({
        where: { id, project: scopeDocProjectQuery(user) },
        select: {
          fileName: true,
          mimeType: true,
          storagePath: true,
          sha256: true,
        },
      })
    : null;
  const store = selectFileStore();
  if (!document || !store)
    return new NextResponse("No encontrado.", { status: 404 });
  try {
    const data = await store.get(document.storagePath);
    return new NextResponse(Buffer.from(data), {
      headers: {
        "content-type": safeContentType(document.mimeType),
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(document.fileName)}`,
        "cache-control": "private, no-store",
        // POR QUÉ: el editor de lecciones manda este hash al guardar para no pisar la edición de otra persona.
        etag: `"${document.sha256}"`,
        "x-content-type-options": "nosniff",
        // POR QUÉ: si el navegador igual lo abre, no ejecuta scripts ni accede a nuestro origen.
        "content-security-policy": "sandbox",
      },
    });
  } catch (error) {
    log("error", "descarga de documento falló", { id, error: String(error) });
    return new NextResponse(
      "El almacén de archivos no respondió. Intenta en unos minutos.",
      { status: 502 },
    );
  }
}
