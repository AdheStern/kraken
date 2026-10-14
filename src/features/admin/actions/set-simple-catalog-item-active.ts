// src/features/admin/actions/set-simple-catalog-item-active.ts
// Da de baja o reactiva un registro de un catálogo simple (borrado lógico de catálogo, AGENTS.md §4).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { canManageAdminAccess } from "../admin-access";
import {
  type SimpleCatalogActiveInput,
  simpleCatalogActiveSchema,
} from "../schemas/simple-catalog-schemas";
import { SIMPLE_CATALOGS } from "../simple-catalogs";

// POR QUÉ: una baja solo oculta el registro en los selectores; los CV, bolsas y tickets que ya lo usan no cambian.
export async function setSimpleCatalogItemActive(
  input: SimpleCatalogActiveInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = simpleCatalogActiveSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const { kind, id, isActive } = parsed.data;
  if (!canManageAdminAccess(user, SIMPLE_CATALOGS[kind].access))
    return actionError(
      "FORBIDDEN",
      `No tienes permiso para editar ${SIMPLE_CATALOGS[kind].title.toLowerCase()}.`,
    );
  const args = { where: { id }, data: { isActive } };
  try {
    if (kind === "areas") await prisma.area.update(args);
    else if (kind === "ciudades") await prisma.city.update(args);
    else if (kind === "unidades") await prisma.unit.update(args);
    else if (kind === "tecnologias") await prisma.technology.update(args);
    else if (kind === "tipos-servicio") await prisma.serviceType.update(args);
    else await prisma.supplier.update(args);
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "setSimpleCatalogItemActive");
  }
}
