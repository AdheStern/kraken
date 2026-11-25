// src/domain/hours/bag-name.ts
// Nombre visible de una bolsa: el que le pusieron o, sin él, la descripción de su línea del CV (AGENTS.md §2.4).

export function toBagName(
  customName: string | null,
  lineDescription: string,
): string {
  return customName ?? lineDescription;
}
