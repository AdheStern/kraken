// prisma/seed/base-catalogs.ts
// Siembra idempotente de los catálogos base: solo crea lo que falta y nunca renombra, reactiva ni borra lo que
// el administrador ya cambió. La usan `pnpm db:seed:base` (producción) y el seed de desarrollo.
import type { Tx } from "@/server/db";
import * as data from "./base-catalog-data";
import { upsertRoles } from "./roles";

export async function seedBaseCatalogs(tx: Tx): Promise<number> {
  await upsertRoles(tx);
  let created = 0;
  for (const city of data.CITIES) {
    if (await tx.city.findUnique({ where: { code: city.code } })) continue;
    await tx.city.create({ data: city });
    created++;
  }
  created += await seedWarehouses(tx);
  for (const area of data.AREAS) {
    if (await tx.area.findUnique({ where: { code: area.code } })) continue;
    await tx.area.create({ data: area });
    created++;
  }
  for (const unit of data.UNITS) {
    if (await tx.unit.findUnique({ where: { code: unit.code } })) continue;
    await tx.unit.create({ data: unit });
    created++;
  }
  created += await seedNamed(tx, "technology", data.TECHNOLOGIES);
  created += await seedNamed(tx, "serviceType", data.SERVICE_TYPES);
  for (const parameter of data.PARAMETERS) {
    if (await tx.parameter.findUnique({ where: { key: parameter.key } }))
      continue;
    await tx.parameter.create({ data: parameter });
    created++;
  }
  for (const policy of data.SLA_POLICIES) {
    const key = { modality: policy.modality, priority: policy.priority };
    if (await tx.slaPolicy.findUnique({ where: { modality_priority: key } }))
      continue;
    await tx.slaPolicy.create({ data: policy });
    created++;
  }
  return created;
}

// TRAMPA: el administrador puede haber creado el almacén de una ciudad con otro código; se respeta el suyo.
async function seedWarehouses(tx: Tx): Promise<number> {
  let created = 0;
  for (const { cityCode, ...warehouse } of data.WAREHOUSES) {
    if (await tx.warehouse.findUnique({ where: { code: warehouse.code } }))
      continue;
    const city = cityCode
      ? await tx.city.findUnique({ where: { code: cityCode } })
      : null;
    const taken = await tx.warehouse.findFirst({
      where: city
        ? { kind: "FISICO", cityId: city.id, isActive: true }
        : { kind: warehouse.kind },
    });
    if (taken || (cityCode && !city)) continue;
    await tx.warehouse.create({ data: { ...warehouse, cityId: city?.id } });
    created++;
  }
  return created;
}

// TRAMPA: la comparación ignora mayúsculas; "Cisco" cargado a mano no se duplica con "CISCO" de la hoja.
async function seedNamed(
  tx: Tx,
  model: "technology" | "serviceType",
  names: readonly string[],
): Promise<number> {
  let created = 0;
  for (const name of names) {
    const where = { name: { equals: name, mode: "insensitive" as const } };
    const found =
      model === "technology"
        ? await tx.technology.findFirst({ where })
        : await tx.serviceType.findFirst({ where });
    if (found) continue;
    if (model === "technology") await tx.technology.create({ data: { name } });
    else await tx.serviceType.create({ data: { name } });
    created++;
  }
  return created;
}
