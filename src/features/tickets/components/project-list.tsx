// src/features/tickets/components/project-list.tsx
// Proyectos con su cliente, áreas, fechas, tickets abiertos y bolsas; enlaza al tablero filtrado (AGENTS.md §2.6).
import Link from "next/link";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Badge } from "@/components/ui/badge";
import type { ProjectView } from "../types";
import { ProjectStatusButton } from "./project-status-button";

export function ProjectList({ projects }: { projects: ProjectView[] }) {
  if (projects.length === 0)
    return (
      <KrakenEmpty title="No hay proyectos todavía">
        Crea un proyecto para agrupar los tickets de una implementación y darle
        sus propias bolsas de horas.
      </KrakenEmpty>
    );
  return (
    <ul className="kr-solid divide-y divide-border/60 rounded-xl">
      {projects.map((p) => (
        <li
          key={p.id}
          className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 text-sm"
        >
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{p.name}</span>
              {p.status === "CERRADO" && (
                <Badge variant="secondary">Cerrado</Badge>
              )}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {p.customerName} · {p.areaCodes.join(" / ")}
              {(p.startsOn || p.endsOn) &&
                ` · ${p.startsOn ?? "…"} → ${p.endsOn ?? "…"}`}
            </p>
          </div>
          <span className="text-xs tabular-nums text-muted-foreground">
            {p.openTickets}{" "}
            {p.openTickets === 1 ? "ticket abierto" : "tickets abiertos"} ·{" "}
            {p.bags} {p.bags === 1 ? "bolsa" : "bolsas"}
          </span>
          <Link
            href={`/tickets?proyecto=${p.id}`}
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            Ver tickets
          </Link>
          {p.canManage && (
            <ProjectStatusButton projectId={p.id} status={p.status} />
          )}
        </li>
      ))}
    </ul>
  );
}
