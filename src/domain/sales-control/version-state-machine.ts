// src/domain/sales-control/version-state-machine.ts
// Transiciones permitidas de una versión de CV (AGENTS.md §8). La interfaz muestra solo estas;
// el servidor vuelve a validarlas y la base bloquea los cambios fuera de BORRADOR (ADR-11).

export type CvVersionState =
  | "BORRADOR"
  | "EN_APROBACION"
  | "OBSERVADA"
  | "APROBADA"
  | "REEMPLAZADA"
  | "ANULADA";

export type CvVersionEvent =
  | "ENVIAR"
  | "APROBAR_RONDA"
  | "OBSERVAR"
  | "REEMPLAZAR"
  | "ANULAR";

const TRANSITIONS: Record<
  CvVersionEvent,
  Partial<Record<CvVersionState, CvVersionState>>
> = {
  ENVIAR: { BORRADOR: "EN_APROBACION" },
  APROBAR_RONDA: { EN_APROBACION: "APROBADA" },
  OBSERVAR: { EN_APROBACION: "OBSERVADA" },
  REEMPLAZAR: { APROBADA: "REEMPLAZADA" },
  // [CONFIRMAR] una APROBADA se anula solo sin consumos de horas ni despachos (se verifica fuera).
  ANULAR: { BORRADOR: "ANULADA", APROBADA: "ANULADA" },
};

export function nextVersionState(
  from: CvVersionState,
  event: CvVersionEvent,
): CvVersionState | null {
  return TRANSITIONS[event][from] ?? null;
}

// REGLA: se crea una versión nueva desde la vigente aprobada (cambio) o la observada (corrección) (§2.3).
export function canStartNewVersion(latest: CvVersionState): boolean {
  return latest === "APROBADA" || latest === "OBSERVADA";
}
