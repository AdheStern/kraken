// src/domain/inventory/net-ticket-materials.ts
// Materiales que un ticket tiene hoy: salidas menos devoluciones por producto, con los seriales que no volvieron
// (AGENTS.md §2.8). Solo cantidades: nunca costos (regla 12).
import Decimal from "decimal.js";

// POR QUÉ: la cantidad llega con el signo del libro (− salió del almacén, + volvió); para el ticket es al revés.
export type MaterialLine = {
  productId: string;
  code: string;
  description: string;
  quantity: Decimal;
  serial: string | null;
};

export type NetMaterial = {
  productId: string;
  code: string;
  description: string;
  quantity: Decimal;
  serials: string[];
};

type Group = Omit<NetMaterial, "serials"> & { serials: Map<string, number> };

export function netTicketMaterials(
  lines: readonly MaterialLine[],
): NetMaterial[] {
  const groups = new Map<string, Group>();
  for (const line of lines) {
    const group = groups.get(line.productId) ?? {
      productId: line.productId,
      code: line.code,
      description: line.description,
      quantity: new Decimal(0),
      serials: new Map<string, number>(),
    };
    group.quantity = group.quantity.minus(line.quantity);
    if (line.serial) {
      const held = group.serials.get(line.serial) ?? 0;
      group.serials.set(
        line.serial,
        held + (line.quantity.isNegative() ? 1 : -1),
      );
    }
    groups.set(line.productId, group);
  }
  return [...groups.values()]
    .filter((group) => group.quantity.greaterThan(0))
    .sort((a, b) => a.code.localeCompare(b.code, "es"))
    .map((group) => ({
      ...group,
      serials: [...group.serials]
        .filter(([, held]) => held > 0)
        .map(([serial]) => serial)
        .sort(),
    }));
}
