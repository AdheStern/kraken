// src/domain/documentation/reorder-phases.ts
// Nuevo orden de las fases de documentación al subir o bajar una entre las activas (AGENTS.md §2.10).

export type PhaseSlot = { id: string; isActive: boolean };

// REGLA: el vecino se busca entre las activas, que son las que ve el usuario; las dadas de baja conservan su
// lugar. Devuelve null si la fase no está activa y la misma lista si ya está en el extremo.
export function reorderPhases(
  phases: readonly PhaseSlot[],
  id: string,
  direction: "up" | "down",
): string[] | null {
  const active = phases.filter((phase) => phase.isActive);
  const at = active.findIndex((phase) => phase.id === id);
  if (at < 0) return null;
  const other = active[direction === "up" ? at - 1 : at + 1];
  return phases.map((phase) => {
    if (!other) return phase.id;
    if (phase.id === id) return other.id;
    return phase.id === other.id ? id : phase.id;
  });
}
