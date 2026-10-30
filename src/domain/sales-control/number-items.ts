// src/domain/sales-control/number-items.ts
// Número de ítem de cada línea del CV en el orden en que se ve: las principales 1, 2, 3 y sus subítems 1.1, 1.2.
// Las notas no llevan número. Lo usan la grilla, la validación al guardar y el Excel (AGENTS.md §2.1).

export type NumberableLine = {
  kind: "ITEM" | "NOTA";
  isSubItem: boolean;
  // Lote de la línea (null = sin lote): un subítem cuelga de la principal anterior del mismo lote.
  sectionKey: string | null;
};

export type ItemNumbering = {
  labels: (string | null)[];
  // Subítems sin una principal antes en su lote; se numeran como principales y no se pueden guardar.
  orphans: number[];
};

export function numberItems(lines: NumberableLine[]): ItemNumbering {
  const labels: (string | null)[] = [];
  const orphans: number[] = [];
  let main = 0;
  let sub = 0;
  let mainSection: string | null | undefined;

  for (const [index, line] of lines.entries()) {
    if (line.kind === "NOTA") {
      labels.push(null);
      continue;
    }
    if (line.isSubItem && main > 0 && mainSection === line.sectionKey) {
      sub += 1;
      labels.push(`${main}.${sub}`);
      continue;
    }
    if (line.isSubItem) orphans.push(index);
    main += 1;
    sub = 0;
    mainSection = line.sectionKey;
    labels.push(String(main));
  }
  return { labels, orphans };
}
