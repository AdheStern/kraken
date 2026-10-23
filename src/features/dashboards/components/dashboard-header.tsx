// src/features/dashboards/components/dashboard-header.tsx
// Cabecera común de los tableros: título con el nodo de la red, pestañas y la fila de filtros que gobierna
// todo lo de abajo (AGENTS.md §6).
import { Download } from "lucide-react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import type { DashboardContext } from "../queries/load-dashboard-context";
import { periodToken } from "../schemas/dashboard-filters";
import type { BoardKey } from "../types";
import { BOARD_LABELS, BoardTabs } from "./board-tabs";
import { DashboardFilterBar } from "./dashboard-filter-bar";

type Props = {
  context: DashboardContext;
  active: BoardKey;
  description: string;
  showCity?: boolean;
  showArea?: boolean;
  exportHref?: string;
};

export function DashboardHeader({
  context,
  active,
  description,
  showCity,
  showArea = true,
  exportHref,
}: Props) {
  return (
    <>
      <ModuleHeading
        title={
          active === "metas"
            ? "Metas"
            : `Tablero de ${BOARD_LABELS[active].toLowerCase()}`
        }
        description={description}
        actions={
          exportHref && (
            <a
              href={exportHref}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-input px-3 text-sm font-medium hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <Download className="size-4" aria-hidden="true" />
              Exportar a Excel
            </a>
          )
        }
      />
      <BoardTabs
        boards={context.boards}
        active={active}
        query={context.query}
      />
      <DashboardFilterBar
        periods={context.periods}
        kind={context.filters.period.kind}
        period={periodToken(context.filters.period)}
        areas={showArea ? context.options.areas : []}
        cities={context.options.cities}
        showCity={showCity}
      />
    </>
  );
}
