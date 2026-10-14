// src/features/admin/actions/upsert-simple-catalog-item.ts
// Crea o renombra un registro de un catálogo simple (áreas, ciudades, tecnologías, unidades, tipos de
// servicio, proveedores). El código solo se fija al crear (simple-catalogs.ts).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { prisma } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { canManageAdminAccess } from "../admin-access";
import { hasSimpleCatalogDuplicate } from "../queries/has-simple-catalog-duplicate";
import {
  type SimpleCatalogItemInput,
  simpleCatalogItemSchema,
} from "../schemas/simple-catalog-schemas";
import { SIMPLE_CATALOGS, type SimpleCatalogKind } from "../simple-catalogs";

type Fields = {
  name: string;
  code: string;
  taxId: string | null;
  isHours: boolean;
};

export async function upsertSimpleCatalogItem(
  input: SimpleCatalogItemInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = simpleCatalogItemSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const {
    kind,
    id,
    name,
    code = "",
    taxId = null,
    isHours = false,
  } = parsed.data;
  if (!canManageAdminAccess(user, SIMPLE_CATALOGS[kind].access))
    return actionError(
      "FORBIDDEN",
      `No tienes permiso para editar ${SIMPLE_CATALOGS[kind].title.toLowerCase()}.`,
    );
  if (await hasSimpleCatalogDuplicate(kind, name, id))
    return actionError(
      "CONFLICT",
      `Ya existe «${name}» en ${SIMPLE_CATALOGS[kind].title.toLowerCase()}. Edita ese registro o usa otro nombre.`,
    );
  try {
    const saved = await write(kind, id, { name, code, taxId, isHours });
    return actionOk({ id: saved });
  } catch (error) {
    return toActionError(error, "upsertSimpleCatalogItem");
  }
}

async function write(
  kind: SimpleCatalogKind,
  id: string | null,
  f: Fields,
): Promise<string> {
  const { name, code, taxId, isHours } = f;
  switch (kind) {
    case "areas":
      return id
        ? (await prisma.area.update({ where: { id }, data: { name } })).id
        : (await prisma.area.create({ data: { name, code } })).id;
    case "ciudades":
      return id
        ? (await prisma.city.update({ where: { id }, data: { name } })).id
        : (await prisma.city.create({ data: { name, code } })).id;
    case "unidades":
      return id
        ? (await prisma.unit.update({ where: { id }, data: { name, isHours } }))
            .id
        : (await prisma.unit.create({ data: { name, code, isHours } })).id;
    case "tecnologias":
      return id
        ? (await prisma.technology.update({ where: { id }, data: { name } })).id
        : (await prisma.technology.create({ data: { name } })).id;
    case "tipos-servicio":
      return id
        ? (await prisma.serviceType.update({ where: { id }, data: { name } }))
            .id
        : (await prisma.serviceType.create({ data: { name } })).id;
    case "proveedores":
      return id
        ? (
            await prisma.supplier.update({
              where: { id },
              data: { name, taxId },
            })
          ).id
        : (await prisma.supplier.create({ data: { name, taxId } })).id;
  }
}
