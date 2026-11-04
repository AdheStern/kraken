// src/app/api/admin/access-review.xlsx/route.ts
// Descarga la revisión de accesos en Excel: cuentas con roles, último inicio de sesión y sin uso, y roles
// asignados a mano (ISO 27001 A.5.18; AGENTS.md §7). Solo el administrador del sistema.
import { formatInTimeZone } from "date-fns-tz";
import { BUSINESS_TIME_ZONE } from "@/domain/calendar/business-date";
import { getAccessReview } from "@/features/admin/queries/get-access-review";
import { recordAccess } from "@/server/audit/record-access";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { systemClock } from "@/server/clock";
import { sheetsToXlsx } from "@/server/dashboards/sheets-to-xlsx";
import { attachmentDisposition } from "@/server/files/attachment-disposition";
import { getSessionUser } from "@/server/session";

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET() {
  const user = await getSessionUser();
  if (!user)
    return new Response("Tu sesión expiró. Vuelve a iniciar sesión.", {
      status: 401,
    });
  // TRAMPA: sin permiso responde 404, como las páginas de la administración, para no revelar que existe.
  if (!canManageSystem(user))
    return new Response("No encontrado.", { status: 404 });
  const now = systemClock.now();
  const { accounts, manualRoles } = await getAccessReview(now);
  await recordAccess({
    actorId: user.id,
    entity: "admin.revision_accesos",
    entityId: "revision-accesos",
    action: "EXPORTAR",
  });
  const file = await sheetsToXlsx("Revisión de accesos", [
    {
      name: "Cuentas",
      columns: [
        { header: "Nombre", key: "name", width: 28 },
        { header: "Correo", key: "email", width: 32 },
        { header: "Tipo", key: "kind", width: 12 },
        { header: "Empresa", key: "customer", width: 24 },
        { header: "Activa", key: "active", width: 8 },
        { header: "Roles", key: "roles", width: 48 },
        { header: "Último inicio de sesión", key: "lastSignIn", width: 22 },
        { header: "Sin uso en 90 días", key: "dormant", width: 18 },
      ],
      rows: accounts.map((a) => ({
        name: a.name,
        email: a.email,
        kind: a.kind,
        customer: a.customer,
        active: a.isActive ? "Sí" : "No",
        roles: a.roles,
        lastSignIn: a.lastSignInAt ? toLaPaz(a.lastSignInAt) : "Nunca",
        dormant: a.isDormant ? "Revisar" : null,
      })),
    },
    {
      name: "Roles a mano",
      columns: [
        { header: "Nombre", key: "name", width: 28 },
        { header: "Correo", key: "email", width: 32 },
        { header: "Rol", key: "role", width: 28 },
        { header: "Área", key: "area", width: 10 },
        { header: "Asignado el", key: "grantedAt", width: 20 },
      ],
      rows: manualRoles.map((r) => ({ ...r, grantedAt: toLaPaz(r.grantedAt) })),
    },
  ]);
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": XLSX_TYPE,
      "content-disposition": attachmentDisposition(
        `revision-accesos-${formatInTimeZone(now, BUSINESS_TIME_ZONE, "yyyy-MM-dd")}.xlsx`,
      ),
      "cache-control": "private, no-store",
    },
  });
}

function toLaPaz(at: Date): string {
  return formatInTimeZone(at, BUSINESS_TIME_ZONE, "yyyy-MM-dd HH:mm");
}
