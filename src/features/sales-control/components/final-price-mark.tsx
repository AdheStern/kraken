// src/features/sales-control/components/final-price-mark.tsx
// Marca «Ajustado» junto a un total de CV cuando se muestra su precio final en lugar del calculado por las líneas
// (AGENTS.md §2.3, decisión 2026-11-19).
export function FinalPriceMark() {
  return (
    <span
      className="ml-1.5 rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary"
      title="Precio final fijado por Administración o el gerente general"
    >
      Ajustado
    </span>
  );
}
