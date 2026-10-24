// src/app/api/tickets/attachments/[id]/route.ts
// Descarga de un adjunto de ticket con authz: solo si el ticket es visible para el usuario (AGENTS.md §7, §2.9).
import { NextResponse } from "next/server";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { prisma } from "@/server/db";
import { safeContentType } from "@/server/files/safe-content-type";
import { selectFileStore } from "@/server/files/select-file-store";
import { log } from "@/server/log";
import { getSessionUser } from "@/server/session";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/tickets/attachments/[id]">,
) {
  const user = await getSessionUser();
  if (!user)
    return new NextResponse("Inicia sesión para descargar.", { status: 401 });
  const { id } = await params;
  const attachment = await prisma.ticketAttachment.findFirst({
    where: { id, ticket: scopeTicketQuery(user) },
    select: { fileName: true, mimeType: true, storagePath: true },
  });
  const store = selectFileStore();
  if (!attachment || !store)
    return new NextResponse("No encontrado.", { status: 404 });
  try {
    const data = await store.get(attachment.storagePath);
    return new NextResponse(Buffer.from(data), {
      headers: {
        "content-type": safeContentType(attachment.mimeType),
        "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(attachment.fileName)}`,
        "cache-control": "private, no-store",
        "x-content-type-options": "nosniff",
        // POR QUÉ: si el navegador igual lo abre, no ejecuta scripts ni accede a nuestro origen.
        "content-security-policy": "sandbox",
      },
    });
  } catch (error) {
    log("error", "descarga de adjunto falló", { id, error: String(error) });
    return new NextResponse(
      "El almacén de archivos no respondió. Intenta en unos minutos.",
      { status: 502 },
    );
  }
}
