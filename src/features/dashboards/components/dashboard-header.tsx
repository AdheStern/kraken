// src/features/dashboards/components/dashboard-header.tsx
// Cabecera común de los tableros: título con el nodo de la red, pestañas y la fila de filtros que gobierna
// todo lo de abajo (AGENTS.md §6).
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
};

export function DashboardHeader({
  context,
  active,
  description,
  showCity,
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
        areas={context.options.areas}
        cities={context.options.cities}
        showCity={showCity}
      />
    </>
  );
}
