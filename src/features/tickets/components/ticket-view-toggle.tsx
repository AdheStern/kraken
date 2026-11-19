// src/features/tickets/components/ticket-view-toggle.tsx
// Selector de vista de los tickets, tablero o lista; vive en la URL («modo») y conserva los filtros
// (AGENTS.md §5).
import { KanbanSquare, List } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { toTicketListHref } from "../schemas/ticket-list-params";

type Props = { mode: "tablero" | "lista"; basePath: string; query: string };

const VIEWS = [
  { mode: "tablero", label: "Tablero", Icon: KanbanSquare },
  { mode: "lista", label: "Lista", Icon: List },
] as const;

export function TicketViewToggle({ mode, basePath, query }: Props) {
  return (
    <nav
      aria-label="Vista de los tickets"
      className="inline-flex w-fit rounded-lg border border-border bg-muted/40 p-0.5"
    >
      {VIEWS.map(({ mode: view, label, Icon }) => (
        <Link
          key={view}
          href={toTicketListHref(basePath, new URLSearchParams(query), {
            modo: view === "tablero" ? null : view,
          })}
          aria-current={mode === view ? "page" : undefined}
          scroll={false}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            mode === view
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
