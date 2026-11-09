// src/lib/rank-catalog-options.ts
// Búsqueda de los selectores de catálogo: qué opciones coinciden con lo escrito y en qué orden. Primero la etiqueta
// igual a lo escrito, luego la que empieza así, la que lo contiene y al final las que solo coinciden por la ayuda
// (departamento, NIT…). «La Paz, Achocalla» busca la ayuda y la etiqueta a la vez, en cualquier orden.

type Searchable = { label: string; hint?: string };

const LABEL_EXACT = 0;
const LABEL_START = 1;
const LABEL_CONTAINS = 2;
const HINT_ONLY = 3;

export function rankCatalogOptions<T extends Searchable>(
  options: readonly T[],
  query: string,
): T[] {
  if (normalize(query) === "") return [...options];
  return options
    .map((option, index) => ({
      option,
      index,
      rank: rankOption(option, query),
    }))
    .filter(
      (entry): entry is typeof entry & { rank: number } => entry.rank !== null,
    )
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((entry) => entry.option);
}

export function rankOption(option: Searchable, query: string): number | null {
  const whole = rankText(option, normalize(query));
  // POR QUÉ: una razón social puede llevar coma («DIMA, S.A.»); el texto entero también cuenta.
  const split = rankSplit(option, query);
  if (whole === null) return split;
  return split === null ? whole : Math.min(whole, split);
}

function rankText(option: Searchable, q: string): number | null {
  if (q === "") return null;
  const label = normalize(option.label);
  if (label === q) return LABEL_EXACT;
  if (label.startsWith(q)) return LABEL_START;
  if (label.includes(q)) return LABEL_CONTAINS;
  if (option.hint !== undefined && normalize(option.hint).includes(q)) {
    return HINT_ONLY;
  }
  return null;
}

function rankSplit(option: Searchable, query: string): number | null {
  const parts = query.split(",").map(normalize).filter(Boolean);
  if (parts.length !== 2 || option.hint === undefined) return null;
  const hint = normalize(option.hint);
  const ranks = [
    [parts[0], parts[1]],
    [parts[1], parts[0]],
  ]
    .filter(([inHint]) => hint.includes(inHint))
    .map(([, inLabel]) => rankText({ label: option.label }, inLabel))
    .filter((rank): rank is number => rank !== null);
  return ranks.length > 0 ? Math.min(...ranks) : null;
}

// POR QUÉ: sin tildes ni mayúsculas, como el filtro de Base UI («potosi» encuentra «Potosí»).
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
