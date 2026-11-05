// src/app/(app)/inventario/seriales/page.tsx
// Trazabilidad de un serial: dónde entró, por dónde pasó, a qué CV o ticket salió y su vigencia (AGENTS.md §2.8,
// decisión 2026-11-05). Para quien consulta inventario; cada parte con su alcance y sin costos (§2.9).
import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Skeleton } from "@/components/ui/skeleton";
import { SerialSearch } from "@/features/inventory/components/serial-search";
import { SerialTraceView } from "@/features/inventory/components/serial-trace-view";
import { getSerialTrace } from "@/features/inventory/queries/get-serial-trace";
import { canSeeInventory } from "@/server/authz/inventory-permissions";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Rastrear serial" };

export default function SerialTracePage({
  searchParams,
}: PageProps<"/inventario/seriales">) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/inventario"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Inventario
      </Link>
      <ModuleHeading
        title="Rastrear serial"
        description="Escribe, escanea o lee con la cámara el serial de un equipo para ver su recorrido: ingreso, traspasos, a qué CV o ticket salió y su vigencia."
      />
      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <Trace searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function Trace({
  searchParams,
}: Pick<PageProps<"/inventario/seriales">, "searchParams">) {
  const user = await requireUser();
  if (!canSeeInventory(user)) notFound();
  const params = await searchParams;
  const serial = typeof params.serial === "string" ? params.serial.trim() : "";
  const trace = serial ? await getSerialTrace(user, serial) : null;
  return (
    <>
      <SerialSearch key={serial} defaultValue={serial} />
      {trace &&
        (trace.units.length > 0 || trace.sales.length > 0 ? (
          <SerialTraceView trace={trace} />
        ) : (
          <KrakenEmpty title={`No hay rastro del serial ${serial}.`}>
            Revisa que esté bien escrito. Si el equipo nunca pasó por un almacén
            ni figura en un CV que puedes ver, no aparece aquí.
          </KrakenEmpty>
        ))}
    </>
  );
}
