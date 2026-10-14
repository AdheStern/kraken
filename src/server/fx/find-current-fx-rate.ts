// src/server/fx/find-current-fx-rate.ts
// TC oficial vigente en una fecha de negocio: el último que ya rige y, si el mismo día hay uno del BCB y uno
// cargado a mano, el del BCB (AGENTS.md §2.2, ADR-09).
// TRAMPA: el BCB publica hacia las 23:30 el TC que rige al día siguiente; "el último cargado" puede ser de mañana.
import type { Tx } from "@/server/db";

export function findCurrentFxRate(
  db: Pick<Tx, "fxRate">,
  businessDate: string,
) {
  return db.fxRate.findFirst({
    where: { effectiveOn: { lte: new Date(`${businessDate}T00:00:00Z`) } },
    // POR QUÉ: el enum se ordena por su declaración (CUCU antes que MANUAL).
    orderBy: [{ effectiveOn: "desc" }, { source: "asc" }],
  });
}
