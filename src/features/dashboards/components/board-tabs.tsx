// src/features/dashboards/components/board-tabs.tsx
// Pestañas de los tableros como enlaces: conservan el periodo, el área y la ciudad elegidos, así se comparan
// los tableros sobre el mismo corte (AGENTS.md §6).
import Link from "next/link";
import { cn } from "@/lib/utils";
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
    <nav aria-label="Tableros" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex w-max gap-1 rounded-xl bg-muted/60 p-1">
        {boards.map((board) => (
          <li key={board}>
            <Link
              href={`/tableros/${board}${query ? `?${query}` : ""}`}
              aria-current={board === active ? "page" : undefined}
              className={cn(
                "block rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none",
                board === active && "bg-background text-foreground shadow-sm",
              )}
            >
              {BOARD_LABELS[board]}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
