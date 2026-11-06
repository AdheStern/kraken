// src/app/api/customers/contacts.xlsx/route.ts
// Descarga el directorio de contactos en Excel con los mismos filtros de la pantalla: todos o los de un cliente
// (decisión 2026-11-06). Solo quien puede ver el directorio; queda en la auditoría de accesos (ADR-14).
import type { NextRequest } from "next/server";
import { toContactFilters } from "@/features/customers/contact-filters";
import { contactsSheet } from "@/features/customers/export/contacts-sheet";
import { listContacts } from "@/features/customers/queries/list-contacts";
import { recordAccess } from "@/server/audit/record-access";
import { canBrowseContacts } from "@/server/authz/contact-permissions";
import { sheetsToXlsx } from "@/server/dashboards/sheets-to-xlsx";
import { attachmentDisposition } from "@/server/files/attachment-disposition";
import { getSessionUser } from "@/server/session";

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user)
    return new Response("Tu sesión expiró. Vuelve a iniciar sesión.", {
      status: 401,
    });
  // TRAMPA: sin permiso responde 404, para no revelar que existe.
  if (!canBrowseContacts(user))
    return new Response("No encontrado.", { status: 404 });
  const filters = toContactFilters(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  const contacts = await listContacts(user, filters, undefined);
  await recordAccess({
    actorId: user.id,
    entity: "core.cliente_contacto",
    entityId: filters.customerId ?? "directorio",
    action: "EXPORTAR",
  });
  const file = await sheetsToXlsx("Contactos", [contactsSheet(contacts)]);
  const name =
    filters.customerId && contacts[0]
      ? `Contactos ${contacts[0].customerName}.xlsx`
      : "Contactos de clientes.xlsx";
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": XLSX_TYPE,
      "content-disposition": attachmentDisposition(name),
      "cache-control": "private, no-store",
    },
  });
}
