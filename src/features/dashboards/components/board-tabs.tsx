// src/features/dashboards/components/board-tabs.tsx
// Pestañas de los tableros como enlaces: conservan el periodo, el área y la ciudad elegidos, así se comparan
// los tableros sobre el mismo corte (AGENTS.md §6).
import { GooeyNav } from "@/components/ui/gooey-nav";
import type { BoardKey } from "../types";

export const BOARD_LABELS: Record<BoardKey, string> = {
  ventas: "Ventas",
  operacion: "Operación",
  inventario: "Inventario",
  metas: "Metas",
};

type Props = {
  boards: readonly BoardKey[];
  active: BoardKey;
  query: string;
};

export function BoardTabs({ boards, active, query }: Props) {
  if (boards.length < 2) return null;
  return (
    <GooeyNav
      label="Tableros"
      active={active}
      items={boards.map((board) => ({
        key: board,
        label: BOARD_LABELS[board],
        href: `/tableros/${board}${query ? `?${query}` : ""}`,
      }))}
    />
  );
}
