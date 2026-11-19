// src/lib/to-query-string.ts
// Los searchParams de una página como query string, para construir enlaces que conservan los filtros.
export function toQueryString(
  raw: Record<string, string | string[] | undefined>,
): string {
  return new URLSearchParams(
    Object.entries(raw).flatMap(([k, v]) =>
      typeof v === "string" ? [[k, v]] : [],
    ),
  ).toString();
}
