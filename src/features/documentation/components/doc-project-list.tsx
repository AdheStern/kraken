// src/features/documentation/components/doc-project-list.tsx
// Proyectos de documentación con su cliente, encargado, tecnologías y documentos; cada uno abre su detalle.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import type { DocProjectSummary } from "../types";

type Props = { projects: DocProjectSummary[]; search: string };

export function DocProjectList({ projects, search }: Props) {
  if (projects.length === 0)
    return search ? (
      <KrakenEmpty title={`Ningún proyecto coincide con «${search}».`}>
        Prueba con otra parte del nombre o del cliente.
      </KrakenEmpty>
    ) : (
      <KrakenEmpty title="Aún no hay proyectos de documentación.">
        Crea el primero con «Nuevo proyecto»; después subes sus documentos en
        cada fase.
      </KrakenEmpty>
    );
  return (
    <ul className="kr-solid divide-y divide-border/60 rounded-xl">
      {projects.map((p) => (
        <li key={p.id}>
          <Link
            href={`/documentacion/${p.id}`}
            className="flex items-center gap-4 px-4 py-3 text-sm hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {p.customerName} · Encargado: {p.ownerName}
                {p.technologies.length > 0 && ` · ${p.technologies.join(", ")}`}
              </p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {p.documentCount === 1
                ? "1 documento"
                : `${p.documentCount} documentos`}
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
