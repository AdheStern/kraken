// src/lib/match-catalog.ts
// Reconoce un valor pegado desde Excel en un catálogo (proveedores, tecnologías, áreas…) por id, nombre o ayuda,
// sin distinguir mayúsculas ni tildes. Lo usan los pegados del CV, del leasing y de la carga histórica de tickets.

export type Catalog = readonly { id: string; label: string; hint?: string }[];

// POR QUÉ: en las planillas el mismo valor llega como código, nombre o con otra capitalización.
export function matchCatalog(catalog: Catalog, value: string): string | null {
  const wanted = normalize(value);
  const found = catalog.find((option) =>
    [option.id, option.label, option.hint].some(
      (candidate) => candidate && normalize(candidate) === wanted,
    ),
  );
  return found?.id ?? null;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toUpperCase();
}
