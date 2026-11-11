// src/features/sales-control/match-catalog.ts
// Reconoce un valor pegado desde Excel en un catálogo (proveedores, tecnologías, áreas…) por id, nombre o ayuda,
// sin distinguir mayúsculas ni tildes. Lo usan el pegado de las líneas y el del leasing.

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
