// src/features/help/components/tours-list.tsx
// Recorridos guiados del rol para repetirlos desde la ayuda: cada uno abre su pantalla y arranca solo
// (?recorrido=1); los de un CV o un ticket se abren con su botón «Recorrido» (decisión 2026-11-05).
import { Compass } from "lucide-react";
import Link from "next/link";
import type { VisibleTour } from "../queries/list-visible-tours";

export function ToursList({ tours }: { tours: VisibleTour[] }) {
  return (
    <section
      aria-labelledby="recorridos"
      className="kr-solid flex flex-col gap-4 rounded-xl p-5"
    >
      <div>
        <h2 id="recorridos" className="text-lg font-semibold">
          Recorridos guiados
        </h2>
        <p className="text-sm text-muted-foreground">
          Un paseo corto por cada pantalla, solo con lo que tu rol puede usar.
          También se repiten con el botón «Recorrido» de cada pantalla.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {tours.map((tour) => (
          <li key={tour.id}>
            {tour.href ? (
              <Link
                href={`${tour.href}?recorrido=1`}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-muted/60"
              >
                <Compass className="size-4 text-primary" aria-hidden="true" />
                {tour.title}
              </Link>
            ) : (
              <p className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                <Compass className="size-4" aria-hidden="true" />
                {tour.title}: ábrelo desde «Recorrido» en un{" "}
                {tour.id === "cv-editor" ? "CV" : "ticket"}
              </p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
