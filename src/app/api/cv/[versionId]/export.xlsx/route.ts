// src/app/api/cv/[versionId]/export.xlsx/route.ts
// Descarga una versión de CV en la plantilla oficial PA-PR-03-RE-01, con authz (AGENTS.md §2.9 y §7).
import type { NextRequest } from "next/server";
import { getCvExportData } from "@/features/sales-control/queries/get-cv-export-data";
import { canExportCvVersion } from "@/server/authz/cv-permissions";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { prisma } from "@/server/db";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import { exportCvToXlsx } from "@/server/sales-control/export/excel-cv-exporter";
import { getSessionUser } from "@/server/session";

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export async function GET(
  _request: NextRequest,
  ctx: RouteContext<"/api/cv/[versionId]/export.xlsx">,
) {
  const { versionId } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return new Response("Tu sesión expiró. Vuelve a iniciar sesión.", {
      status: 401,
    });

  // TRAMPA: una versión fuera del alcance responde 404, igual que una inexistente, para no revelar que existe.
  const version = await prisma.cvVersion.findFirst({
    where: { id: versionId, cv: scopeCvQuery(user) },
    select: { cvId: true, status: true },
  });
  const access = version ? await loadCvAccess(version.cvId, versionId) : null;
  if (!version || !access)
    return new Response("No encontramos ese CV.", { status: 404 });
  if (!canExportCvVersion(user, access, version.status)) {
    return new Response("No tienes permiso para exportar esta versión.", {
      status: 403,
    });
  }

  const data = await getCvExportData(versionId);
  if (!data) return new Response("No encontramos ese CV.", { status: 404 });
  const file = await exportCvToXlsx(data);
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": XLSX_TYPE,
      "content-disposition": `attachment; filename="CV ${data.versionLabel}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
}
