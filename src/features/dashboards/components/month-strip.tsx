// src/features/dashboards/components/month-strip.tsx
// Franja "Este mes" de Inicio: cuatro cifras del tablero de cada rol con enlace al tablero completo (AGENTS.md
// §5 navegación, decisión 2026-10-23). Inicio conserva su red y sus paneles.
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { SessionUser } from "@/server/authz/roles";
import { getMonthStrip } from "../queries/get-month-strip";

export async function MonthStrip({ user }: { user: SessionUser }) {
  const strip = await getMonthStrip(user);
  if (!strip) return null;
  return (
    <section
      aria-label={`Este mes, ${strip.periodLabel}`}
      className="kr-solid flex flex-col gap-3 rounded-xl p-4"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">
          Este mes{" "}
          <span className="font-normal text-muted-foreground">
            · {strip.periodLabel}
          </span>
        </h2>
        <Link
          href="/tableros"
          className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
        >
          Ver tableros
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 lg:grid-cols-4">
        {strip.items.map((item) => (
          <div key={item.label} className="min-w-0">
            <dt className="text-xs text-muted-foreground">{item.label}</dt>
            <dd className="truncate text-lg font-semibold tracking-[-0.02em]">
              {item.value}
            </dd>
            <dd className="text-xs text-muted-foreground">{item.hint}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
