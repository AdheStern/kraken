// src/app/api/cv/attachments/[id]/route.ts
// Descarga de un adjunto del CV con authz: solo si el CV es visible y el usuario ve sus costos, porque un adjunto
// puede ser una cotización con costos (AGENTS.md §7, §2.9, regla 12).
import { NextResponse } from "next/server";
import { recordAccess } from "@/server/audit/record-access";
import { canSeeCvAttachments } from "@/server/authz/cv-attachment-permissions";
import { prisma } from "@/server/db";
import { attachmentDisposition } from "@/server/files/attachment-disposition";
import { safeContentType } from "@/server/files/safe-content-type";
import { selectFileStore } from "@/server/files/select-file-store";
import { log } from "@/server/log";
import { loadCvAttachmentAccess } from "@/server/sales-control/cv-attachment-access";
import { getSessionUser } from "@/server/session";

export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/cv/attachments/[id]">,
) {
  const user = await getSessionUser();
  if (!user)
    return new NextResponse("Inicia sesión para descargar.", { status: 401 });
  const { id } = await params;
  const attachment = await prisma.cvAttachment.findUnique({
    where: { id },
    select: { cvId: true, fileName: true, mimeType: true, storagePath: true },
  });
  const found = attachment
    ? await loadCvAttachmentAccess(user, attachment.cvId)
    : null;
  const store = selectFileStore();
  // POR QUÉ: sin permiso responde igual que si no existiera, para no revelar qué adjuntos hay.
  if (
    !attachment ||
    !found ||
    !canSeeCvAttachments(user, found.access) ||
    !store
  )
    return new NextResponse("No encontrado.", { status: 404 });
  await recordAccess({
    actorId: user.id,
    entity: "cv.adjunto",
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
