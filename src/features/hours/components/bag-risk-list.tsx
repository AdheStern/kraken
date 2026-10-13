// src/features/hours/components/bag-risk-list.tsx
// Seguimiento de bolsas: primero las en riesgo (consumo alto o vencen pronto), luego las activas y, plegadas,
// las agotadas, vencidas y cerradas (AGENTS.md §2.4 alertas, §6 bolsas en riesgo).
import { ChevronRight, Hourglass, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import type { BagSummary } from "../types";
import { BagRow } from "./bag-row";

type Props = { bags: BagSummary[]; isFiltered: boolean };

export function BagRiskList({ bags, isFiltered }: Props) {
  if (bags.length === 0) return <EmptyState isFiltered={isFiltered} />;
  const atRisk = bags.filter((b) => b.riskGroup === "EN_RIESGO");
  const active = bags.filter((b) => b.riskGroup === "ACTIVA");
  const inactive = bags.filter((b) => b.riskGroup === "INACTIVA");
  return (
    <div className="flex flex-col gap-6">
      {atRisk.length > 0 && (
        <Section
          title="En riesgo"
          hint="Consumo alto o vencimiento cercano"
          icon={
            <TriangleAlert className="size-4 text-warning" aria-hidden="true" />
          }
          bags={atRisk}
          emphasis
        />
      )}
      {active.length > 0 && <Section title="Activas" bags={active} />}
      {inactive.length > 0 && (
        <details className="group" open={atRisk.length + active.length === 0}>
          <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
            <ChevronRight
              className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            />
            Agotadas, vencidas y cerradas
            <span className="tabular-nums">({inactive.length})</span>
          </summary>
          <BagList bags={inactive} className="mt-3" />
        </details>
      )}
    </div>
  );
}

type SectionProps = {
  title: string;
  hint?: string;
  icon?: ReactNode;
  bags: BagSummary[];
  emphasis?: boolean;
};

function Section({ title, hint, icon, bags, emphasis }: SectionProps) {
  return (
    <section className="flex flex-col gap-2.5" aria-label={title}>
      <h2 className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium">
        <span className="flex items-center gap-1.5">
          {icon}
          {title}
          <span className="tabular-nums text-muted-foreground">
            ({bags.length})
          </span>
        </span>
        {hint && (
          <span className="text-xs font-normal text-muted-foreground">
            {hint}
          </span>
        )}
      </h2>
      <BagList
        bags={bags}
        className={emphasis ? "border-warning/40" : undefined}
      />
    </section>
  );
}

function BagList({
  bags,
  className,
}: {
  bags: BagSummary[];
  className?: string;
}) {
  return (
    <ul className={`divide-y rounded-xl border bg-card ${className ?? ""}`}>
      {bags.map((bag) => (
        <BagRow key={bag.id} bag={bag} />
      ))}
    </ul>
  );
}

function EmptyState({ isFiltered }: { isFiltered: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-14 text-center">
      <Hourglass className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-medium">
        {isFiltered
          ? "Ninguna bolsa coincide con el filtro."
          : "Aún no hay bolsas de horas."}
      </p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {isFiltered ? (
          "Prueba con otro cliente o estado."
        ) : (
          <>
            Se crean al aprobarse un CV con líneas de horas de servicio.{" "}
            <Link
              href="/cv"
              className="text-primary underline-offset-4 hover:underline"
            >
              Ir a Control de Venta
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
