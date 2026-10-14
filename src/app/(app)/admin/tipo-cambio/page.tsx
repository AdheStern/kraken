// src/app/(app)/admin/tipo-cambio/page.tsx
// Panel del tipo de cambio (AGENTS.md §2.2): TC vigente, serie de 90 días, promedio de los CV del mes,
// carga manual e historial. Solo lee fx.tipo_cambio; la API la consulta el job (ADR-09).
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { FxHistory } from "@/features/admin/components/fx-history";
import { FxManualForm } from "@/features/admin/components/fx-manual-form";
import { FxSparkline } from "@/features/admin/components/fx-sparkline";
import { FxTodayCard } from "@/features/admin/components/fx-today-card";
import { getFxPanel } from "@/features/admin/queries/get-fx-panel";
import type { FxPanel } from "@/features/admin/types";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Tipo de cambio" };

export default function FxPage() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Tipo de cambio"
        description="TC oficial del BCB, de referencia: cada CV guarda el suyo y avisa si el TC que usa el comercial se aleja demasiado."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Panel />
      </Suspense>
    </main>
  );
}

async function Panel() {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  const panel = await getFxPanel();
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="grid gap-3" aria-labelledby="vigente">
          <h2 id="vigente" className="text-sm font-medium">
            TC vigente
          </h2>
          <FxTodayCard
            today={panel.today}
            current={panel.current}
            previousSellRate={panel.previousSellRate}
          />
          <MonthAverage average={panel.monthAverage} />
        </section>
        <section className="grid content-start gap-3" aria-labelledby="serie">
          <h2 id="serie" className="text-sm font-medium">
            Últimos 90 días (venta)
          </h2>
          <FxSparkline series={panel.series} />
        </section>
      </div>
      <section className="grid gap-3" aria-labelledby="manual">
        <h2 id="manual" className="text-sm font-medium">
          Carga manual
        </h2>
        <FxManualForm today={panel.today} />
      </section>
      <section className="grid gap-3" aria-labelledby="historial">
        <h2 id="historial" className="text-sm font-medium">
          Historial
        </h2>
        <FxHistory history={panel.history} />
      </section>
    </>
  );
}

function MonthAverage({ average }: { average: FxPanel["monthAverage"] }) {
  return (
    <p className="kr-surface rounded-xl p-4 text-sm">
      {average ? (
        <>
          <span className="text-muted-foreground">
            TC promedio en los CV del mes:{" "}
          </span>
          <span className="tabular-nums">
            venta {average.saleFxRate} · costo {average.costFxRate}
          </span>
          <span className="text-muted-foreground">
            {" "}
            ({average.versions} versiones)
          </span>
        </>
      ) : (
        <span className="text-muted-foreground">
          Aún no hay versiones de CV este mes para promediar su TC.
        </span>
      )}
    </p>
  );
}
