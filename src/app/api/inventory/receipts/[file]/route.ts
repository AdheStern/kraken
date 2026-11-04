// src/app/api/inventory/receipts/[file]/route.ts
// Descarga el comprobante PDF de una salida o devolución (/api/inventory/receipts/{id}.pdf), con authz
// (AGENTS.md §2.8, §7). Sin costos.
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getReceipt } from "@/features/inventory/queries/get-receipt";
import { recordAccess } from "@/server/audit/record-access";
import { attachmentDisposition } from "@/server/files/attachment-disposition";
import { buildReceiptPdf } from "@/server/inventory/receipt-pdf";
import { getSessionUser } from "@/server/session";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/inventory/receipts/[file]">,
) {
  const { file } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return new Response("Tu sesión expiró. Vuelve a iniciar sesión.", {
      status: 401,
    });
  const id = file.replace(/\.pdf$/, "");
  // TRAMPA: un comprobante fuera del alcance responde 404, igual que uno inexistente, para no revelar que existe.
  const receipt =
    file.endsWith(".pdf") && z.uuid().safeParse(id).success
      ? await getReceipt(user, id)
      : null;
  if (!receipt)
    return new Response("No encontramos ese comprobante.", { status: 404 });
  await recordAccess({
    actorId: user.id,
    entity: "inv.movimiento",
    entityId: id,
    action: "DESCARGAR",
  });
  const pdf = await buildReceiptPdf(receipt);
  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": attachmentDisposition(
        `${receipt.title} ${receipt.number}.pdf`,
      ),
      "cache-control": "private, no-store",
    },
  });
}
