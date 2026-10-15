// src/features/admin/actions/upsert-simple-catalog-item.ts
// Crea o renombra un registro de un catálogo simple (áreas, ciudades, tecnologías, unidades, tipos de
// servicio, proveedores). El código solo se fija al crear (simple-catalogs.ts).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { runInTransaction, type Tx } from "@/server/db";
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
    const saved = await runInTransaction(async (tx) => {
      const savedId = await write(tx, kind, id, { name, code, taxId, isHours });
      await recordAudit(tx, {
        actorId: user.id,
        entity: SIMPLE_CATALOGS[kind].table,
        entityId: savedId,
        action: id ? "EDITAR" : "CREAR",
        after: { name, ...(id ? {} : { code }), taxId, isHours },
      });
      return savedId;
    });
    return actionOk({ id: saved });
  } catch (error) {
    return toActionError(error, "upsertSimpleCatalogItem");
  }
}

async function write(
  tx: Tx,
  kind: SimpleCatalogKind,
  id: string | null,
  f: Fields,
): Promise<string> {
  const { name, code, taxId, isHours } = f;
  switch (kind) {
    case "areas":
      return id
        ? (await tx.area.update({ where: { id }, data: { name } })).id
        : (await tx.area.create({ data: { name, code } })).id;
    case "ciudades":
      return id
        ? (await tx.city.update({ where: { id }, data: { name } })).id
        : (await tx.city.create({ data: { name, code } })).id;
    case "unidades":
      return id
        ? (await tx.unit.update({ where: { id }, data: { name, isHours } })).id
        : (await tx.unit.create({ data: { name, code, isHours } })).id;
    case "tecnologias":
      return id
        ? (await tx.technology.update({ where: { id }, data: { name } })).id
        : (await tx.technology.create({ data: { name } })).id;
    case "tipos-servicio":
      return id
        ? (await tx.serviceType.update({ where: { id }, data: { name } })).id
        : (await tx.serviceType.create({ data: { name } })).id;
    case "proveedores":
      return id
        ? (
            await tx.supplier.update({
              where: { id },
              data: { name, taxId },
            })
          ).id
        : (await tx.supplier.create({ data: { name, taxId } })).id;
  }
}
