// src/app/api/tickets/attachments/[id]/route.ts
// Descarga de un adjunto de ticket con authz: solo si el ticket es visible para el usuario, también para la cuenta
// de un cliente en los de su empresa (AGENTS.md §7, §2.9, §2.11).
import { NextResponse } from "next/server";
import { recordAccess } from "@/server/audit/record-access";
import { scopeCustomerTicketQuery } from "@/server/authz/scope-customer-ticket-query";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import { prisma } from "@/server/db";
import { attachmentDisposition } from "@/server/files/attachment-disposition";
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
    where: {
      id,
      ticket: { OR: [scopeTicketQuery(user), scopeCustomerTicketQuery(user)] },
    },
    select: { fileName: true, mimeType: true, storagePath: true },
  });
  const store = selectFileStore();
  if (!attachment || !store)
    return new NextResponse("No encontrado.", { status: 404 });
  await recordAccess({
    actorId: user.id,
    entity: "tickets.adjunto",
    entityId: id,
    action: "DESCARGAR",
  });
  try {
    const data = await store.get(attachment.storagePath);
    return new NextResponse(Buffer.from(data), {
      headers: {
        "content-type": safeContentType(attachment.mimeType),
        "content-disposition": attachmentDisposition(attachment.fileName),
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
