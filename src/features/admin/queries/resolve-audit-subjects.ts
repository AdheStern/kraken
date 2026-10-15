// src/features/admin/queries/resolve-audit-subjects.ts
// Nombre legible de lo que tocó cada evento de auditoría (el cliente, el usuario, el CV…), una consulta por
// entidad de la página. Lo que ya no existe o no se reconoce queda sin nombre.
import { prisma } from "@/server/db";
import {
  isParameterKey,
  PARAMETER_DEFINITIONS,
} from "../parameter-definitions";

type Ref = { entity: string; entityId: string };
type Lookup = (ids: string[]) => Promise<{ id: string; label: string }[]>;

const named = (rows: { id: string; name: string }[]) =>
  rows.map((r) => ({ id: r.id, label: r.name }));
const byId = (ids: string[]) => ({ where: { id: { in: ids } } });
const userNames: Lookup = async (ids) =>
  (await prisma.user.findMany(byId(ids))).map((u) => ({
    id: u.id,
    label: u.name,
  }));

const LOOKUPS: Record<string, Lookup> = {
  "core.area": async (ids) => named(await prisma.area.findMany(byId(ids))),
  "core.ciudad": async (ids) => named(await prisma.city.findMany(byId(ids))),
  "core.tecnologia": async (ids) =>
    named(await prisma.technology.findMany(byId(ids))),
  "core.unidad": async (ids) => named(await prisma.unit.findMany(byId(ids))),
  "core.tipo_servicio": async (ids) =>
    named(await prisma.serviceType.findMany(byId(ids))),
  "core.proveedor": async (ids) =>
    named(await prisma.supplier.findMany(byId(ids))),
  "core.cliente": async (ids) =>
    named(await prisma.customer.findMany(byId(ids))),
  "core.cliente_contacto": async (ids) =>
    named(await prisma.customerContact.findMany(byId(ids))),
  "core.feriado": async (ids) =>
    named(await prisma.holiday.findMany(byId(ids))),
  "core.horario_oficina": async (ids) =>
    named(await prisma.officeSchedule.findMany(byId(ids))),
  "core.producto": async (ids) =>
    (await prisma.product.findMany(byId(ids))).map((p) => ({
      id: p.id,
      label: p.code,
    })),
  "core.usuario_perfil": userNames,
  "core.usuario_rol": userNames,
  "cv.cv": async (ids) =>
    (await prisma.cv.findMany(byId(ids))).map((c) => ({
      id: c.id,
      label: c.code,
    })),
  "cv.version": async (ids) =>
    (
      await prisma.cvVersion.findMany({
        ...byId(ids),
        select: { id: true, number: true, cv: { select: { code: true } } },
      })
    ).map((v) => ({ id: v.id, label: `${v.cv.code} v${v.number}` })),
  "horas.bolsa": async (ids) =>
    (
      await prisma.hourBag.findMany({
        ...byId(ids),
        select: { id: true, cvLine: { select: { description: true } } },
      })
    ).map((b) => ({ id: b.id, label: b.cvLine.description })),
};

// POR QUÉ: el parámetro y el grupo de Entra ya se guardan con un id legible (la clave, el Id. del grupo).
const SELF_NAMED = new Set(["core.parametro", "core.grupo_entra_rol"]);

export async function resolveAuditSubjects(
  refs: Ref[],
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  const byEntity = new Map<string, Set<string>>();
  for (const { entity, entityId } of refs) {
    if (entity === "core.parametro" && isParameterKey(entityId))
      labels.set(
        `${entity}|${entityId}`,
        PARAMETER_DEFINITIONS[entityId].label,
      );
    else if (SELF_NAMED.has(entity))
      labels.set(`${entity}|${entityId}`, entityId);
    else if (LOOKUPS[entity])
      byEntity.set(entity, (byEntity.get(entity) ?? new Set()).add(entityId));
  }
  await Promise.all(
    [...byEntity].map(async ([entity, ids]) => {
      for (const row of await LOOKUPS[entity]([...ids]))
        labels.set(`${entity}|${row.id}`, row.label);
    }),
  );
  return labels;
}
