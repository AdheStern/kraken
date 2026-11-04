// src/app/api/dashboards/[board]/export.xlsx/route.ts
// Descarga lo que muestra un tablero en Excel, con los mismos filtros, alcances y permisos que la pantalla
// (AGENTS.md §6 "exportación", §2.9 "Tableros", §7 route handlers).
import type { NextRequest } from "next/server";
import {
  inventorySheets,
  operationsSheets,
  salesSheets,
} from "@/features/dashboards/export/board-sheets";
import {
  engineerDetailSheets,
  engineersSheets,
} from "@/features/dashboards/export/engineer-sheets";
import {
  getEngineerDetail,
  getEngineersDashboard,
} from "@/features/dashboards/queries/get-engineers-dashboard";
import { getInventoryDashboard } from "@/features/dashboards/queries/get-inventory-dashboard";
import { getOperationsDashboard } from "@/features/dashboards/queries/get-operations-dashboard";
import { getSalesDashboard } from "@/features/dashboards/queries/get-sales-dashboard";
import { loadDashboardContext } from "@/features/dashboards/queries/load-dashboard-context";
import { periodToken } from "@/features/dashboards/schemas/dashboard-filters";
import { recordAccess } from "@/server/audit/record-access";
import {
  canSeeEngineersDashboard,
  canSeeOperationsDashboard,
  canSeeSalesDashboard,
} from "@/server/authz/dashboard-permissions";
import type { SessionUser } from "@/server/authz/roles";
import {
  type SheetSpec,
  sheetsToXlsx,
} from "@/server/dashboards/sheets-to-xlsx";
import { getSessionUser } from "@/server/session";

const XLSX_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

type Filters = Awaited<ReturnType<typeof loadDashboardContext>>["filters"];

const BOARDS: Record<
  string,
  {
    title: string;
    load: (
      user: SessionUser,
      f: Filters,
      params: Record<string, string>,
    ) => Promise<SheetSpec[] | null>;
  }
> = {
  ventas: {
    title: "Tablero de ventas",
    load: async (user, f) =>
      canSeeSalesDashboard(user)
        ? salesSheets(await getSalesDashboard(user, f))
        : null,
  },
  operacion: {
    title: "Tablero de operación",
    load: async (user, f) =>
      canSeeOperationsDashboard(user)
        ? operationsSheets(await getOperationsDashboard(user, f))
        : null,
  },
  ingenieros: {
    title: "Tablero de ingenieros",
    // POR QUÉ: con ?ingeniero= exporta el detalle de uno; fuera del alcance del usuario no hay detalle (null → 403).
    load: async (user, f, params) => {
      if (!canSeeEngineersDashboard(user)) return null;
      if (!params.ingeniero)
        return engineersSheets(await getEngineersDashboard(user, f));
      const detail = await getEngineerDetail(user, params.ingeniero, f);
      return detail && engineerDetailSheets(detail);
    },
  },
  inventario: {
    title: "Tablero de inventario",
    load: async (user, f) => {
      const board = await getInventoryDashboard(user, f);
      return board && inventorySheets(board);
    },
  },
};

export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/api/dashboards/[board]/export.xlsx">,
) {
  const { board } = await ctx.params;
  const user = await getSessionUser();
  if (!user)
    return new Response("Tu sesión expiró. Vuelve a iniciar sesión.", {
      status: 401,
    });
  // TRAMPA: un objeto literal también "tiene" constructor o __proto__; solo cuentan sus claves propias.
  const spec = Object.hasOwn(BOARDS, board) ? BOARDS[board] : undefined;
  if (!spec) return new Response("No existe ese tablero.", { status: 404 });
  const params = Object.fromEntries(request.nextUrl.searchParams);
  const { filters } = await loadDashboardContext(user, params);
  const sheets = await spec.load(user, filters, params);
  if (!sheets)
    return new Response("No tienes permiso para exportar este tablero.", {
      status: 403,
    });
  await recordAccess({
    actorId: user.id,
    entity: "dash.tablero",
    entityId: board,
    action: "EXPORTAR",
    detail: params,
  });
  const file = await sheetsToXlsx(spec.title, sheets);
  return new Response(new Uint8Array(file), {
    headers: {
      "content-type": XLSX_TYPE,
      // TRAMPA: las cabeceras HTTP son ASCII; "operación" rompería la respuesta.
      "content-disposition": `attachment; filename="tablero-${board}-${periodToken(filters.period)}.xlsx"`,
      "cache-control": "private, no-store",
    },
  });
}
