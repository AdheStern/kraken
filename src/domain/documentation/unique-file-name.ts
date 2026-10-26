// src/domain/documentation/unique-file-name.ts
// Nombre libre para un documento dentro de una fase de un proyecto (AGENTS.md §2.10).

// REGLA: un nombre repetido en la misma fase se guarda como «nombre (2).ext»; la comparación no distingue
// mayúsculas, como SharePoint.
export function toUniqueFileName(
  name: string,
  taken: readonly string[],
): string {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  if (!used.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf(".");
  const [base, ext] =
    dot > 0 ? [name.slice(0, dot), name.slice(dot)] : [name, ""];
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})${ext}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
}
