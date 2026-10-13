// src/domain/sales-control/compare-versions.ts
// Comparador línea por línea entre dos versiones de un CV: agregadas, quitadas y modificadas (AGENTS.md §2.3).
// Las líneas se emparejan por código (o por descripción si no hay código) y, dentro de la misma clave,
// por orden de aparición; las versiones copian líneas con ids nuevos, así que el id no sirve.

export type ComparableLine = {
  code: string | null;
  description: string;
  fields: Record<string, string>;
};

export type LineChange = { field: string; before: string; after: string };

export type LineComparison =
  | { status: "AGREGADA"; after: ComparableLine }
  | { status: "QUITADA"; before: ComparableLine }
  | {
      status: "MODIFICADA";
      before: ComparableLine;
      after: ComparableLine;
      changes: LineChange[];
    }
  | { status: "IGUAL"; before: ComparableLine; after: ComparableLine };

export function compareVersionLines(
  before: readonly ComparableLine[],
  after: readonly ComparableLine[],
): LineComparison[] {
  const pool = new Map<string, ComparableLine[]>();
  for (const line of before)
    pool.set(matchKey(line), [...(pool.get(matchKey(line)) ?? []), line]);

  const result: LineComparison[] = after.map((line) => {
    const candidates = pool.get(matchKey(line));
    const previous = candidates?.shift();
    if (!previous) return { status: "AGREGADA", after: line };
    const changes = diffFields(previous, line);
    return changes.length > 0
      ? { status: "MODIFICADA", before: previous, after: line, changes }
      : { status: "IGUAL", before: previous, after: line };
  });
  for (const remaining of pool.values()) {
    for (const line of remaining)
      result.push({ status: "QUITADA", before: line });
  }
  return result;
}

function matchKey(line: ComparableLine): string {
  const base = line.code?.trim() || line.description;
  return base.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();
}

function diffFields(
  before: ComparableLine,
  after: ComparableLine,
): LineChange[] {
  const changes: LineChange[] = [];
  if (before.description !== after.description) {
    changes.push({
      field: "description",
      before: before.description,
      after: after.description,
    });
  }
  const keys = new Set([
    ...Object.keys(before.fields),
    ...Object.keys(after.fields),
  ]);
  for (const field of keys) {
    const a = before.fields[field] ?? "";
    const b = after.fields[field] ?? "";
    if (a !== b) changes.push({ field, before: a, after: b });
  }
  return changes;
}
