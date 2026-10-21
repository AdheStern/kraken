// src/features/inventory/actions/upsert-warehouse.ts
// Crea un almacén o cambia su nombre y su ciudad (AGENTS.md §2.8). Código y tipo se fijan al crear; solo el
// administrador del sistema gestiona los almacenes, como las ciudades.
"use server";

import type { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { recordAudit } from "@/server/audit/record-audit";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { runInTransaction, type Tx } from "@/server/db";
import { getSessionUser } from "@/server/session";
import {
  type WarehouseInput,
  warehouseSchema,
} from "../schemas/warehouse-schemas";

type Data = z.output<typeof warehouseSchema>;

export async function upsertWarehouse(
  input: WarehouseInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  if (!canManageSystem(user))
    return actionError(
      "FORBIDDEN",
      "Solo el administrador del sistema gestiona los almacenes.",
    );
  const parsed = warehouseSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  try {
    return await runInTransaction((tx) => save(tx, user.id, parsed.data));
  } catch (error) {
    return toActionError(error, "upsertWarehouse");
  }
}

async function save(
  tx: Tx,
  actorId: string,
  data: Data,
): Promise<ActionResult<{ id: string }>> {
  const current = data.id
    ? await tx.warehouse.findUniqueOrThrow({ where: { id: data.id } })
    : null;
  const kind = current?.kind ?? data.kind ?? "FISICO";
  // POR QUÉ: TRANSITO es lógico y no pertenece a ninguna ciudad.
  const cityId = kind === "TRANSITO" ? null : data.cityId;
  if (kind === "FISICO" && !cityId)
    return actionError("VALIDATION", "Un almacén físico necesita su ciudad.");
  const taken =
    kind === "FISICO" && cityId
      ? await physicalInCity(tx, cityId, data.id)
      : null;
  if (taken)
    return actionError(
      "CONFLICT",
      `La ciudad ya tiene un almacén físico activo: «${taken}». Dalo de baja antes o edítalo.`,
    );
  const saved = current
    ? await tx.warehouse.update({
        where: { id: current.id },
        data: { name: data.name, cityId },
      })
    : await tx.warehouse.create({
        data: { code: data.code ?? "", name: data.name, kind, cityId },
      });
  await recordAudit(tx, {
    actorId,
    entity: "inv.almacen",
    entityId: saved.id,
    action: current ? "EDITAR" : "CREAR",
    before: current
      ? { name: current.name, cityId: current.cityId }
      : undefined,
    after: { code: saved.code, name: saved.name, kind, cityId },
  });
  return actionOk({ id: saved.id });
}

async function physicalInCity(
  tx: Tx,
  cityId: string,
  exceptId: string | null,
): Promise<string | null> {
  const found = await tx.warehouse.findFirst({
    where: {
      kind: "FISICO",
      cityId,
      isActive: true,
      ...(exceptId ? { id: { not: exceptId } } : {}),
    },
    select: { name: true },
  });
  return found?.name ?? null;
}
