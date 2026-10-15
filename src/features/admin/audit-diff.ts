// src/features/admin/audit-diff.ts
// Filas "campo · antes · después" de un evento de auditoría, para leerlo sin abrir el JSON.

export type AuditDiffRow = { field: string; before: string; after: string };

export function toAuditDiff(before: unknown, after: unknown): AuditDiffRow[] {
  const b = asRecord(before);
  const a = asRecord(after);
  const fields = [...new Set([...Object.keys(b), ...Object.keys(a)])];
  return fields
    .map((field) => ({
      field,
      before: field in b ? show(b[field]) : "—",
      after: field in a ? show(a[field]) : "—",
    }))
    .filter((row) => row.before !== row.after);
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function show(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return value === true ? "sí" : value === false ? "no" : String(value);
  return JSON.stringify(value);
}
