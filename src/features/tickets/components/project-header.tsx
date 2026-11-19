// src/features/tickets/components/project-header.tsx
// Cabecera del proyecto: nombre, estado, cliente, áreas, fechas con su avance, acciones y pestañas (resumen,
// tickets y bolsas)
// (AGENTS.md §2.6, §5).
import type { ReactNode } from "react";
import { NodeMark } from "@/components/app-shell/node-mark";
import { Badge } from "@/components/ui/badge";
import { GooeyNav } from "@/components/ui/gooey-nav";
import { toBusinessDate } from "@/domain/calendar/business-date";
import {
  computeProjectSchedule,
  type ProjectSchedule,
} from "@/domain/tickets/project-schedule";
import { systemClock } from "@/server/clock";
import type { ProjectDetailView } from "../types";
import { ProjectStatusButton } from "./project-status-button";

type Props = {
  project: ProjectDetailView;
  tab: "resumen" | "tickets" | "bolsas";
  action: ReactNode;
};

export function ProjectHeader({ project, tab, action }: Props) {
  const base = `/tickets/proyectos/${project.id}`;
  const schedule = computeProjectSchedule(
    project.startsOn,
    project.endsOn,
    toBusinessDate(systemClock.now()),
  );
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-start gap-3">
          <NodeMark className="mt-2" />
          <div>
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-[-0.02em]">
              {project.name}
              {project.status === "CERRADO" && (
                <Badge variant="secondary">Cerrado</Badge>
              )}
            </h1>
            <p className="text-sm text-muted-foreground">
              {project.customerName} · {project.areaCodes.join(" / ")}
              {(project.startsOn || project.endsOn) &&
                ` · ${project.startsOn ?? "…"} → ${project.endsOn ?? "…"}`}
              {project.status === "ACTIVO" && scheduleText(schedule)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {project.canManage && (
            <ProjectStatusButton
              projectId={project.id}
              status={project.status}
            />
          )}
          {action}
        </div>
      </header>
      <GooeyNav
        label="Secciones del proyecto"
        active={tab}
        items={[
          { key: "resumen", label: "Resumen", href: base },
          { key: "tickets", label: "Tickets", href: `${base}?pestana=tickets` },
          { key: "bolsas", label: "Bolsas", href: `${base}?pestana=bolsas` },
        ]}
      />
    </>
  );
}

function scheduleText(schedule: ProjectSchedule): string {
  switch (schedule.kind) {
    case "SIN_FECHAS":
      return "";
    case "POR_EMPEZAR":
      return ` · empieza en ${plural(schedule.daysToStart, "día", "días")}`;
    case "VENCIDO":
      return ` · venció hace ${plural(schedule.daysOverdue, "día", "días")}`;
    case "EN_CURSO":
      return schedule.totalDays
        ? ` · día ${schedule.day} de ${schedule.totalDays}`
        : ` · día ${schedule.day}`;
  }
}

const plural = (n: number, one: string, many: string) =>
  `${n} ${n === 1 ? one : many}`;
