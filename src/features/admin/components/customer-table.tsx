// src/features/admin/components/customer-table.tsx
// Listado de clientes: razón social (abre la ficha), NIT, ciudad y contactos; los dados de baja, atenuados.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { cn } from "@/lib/utils";
import type { CustomerRow } from "../types";

type Props = { customers: CustomerRow[]; search: string };

export function CustomerTable({ customers, search }: Props) {
  if (customers.length === 0)
    return search ? (
      <KrakenEmpty
        compact
        mood="curious"
        title={`Ningún cliente coincide con «${search}».`}
      >
        Busca por otra parte de la razón social o por el NIT, o crea el cliente.
      </KrakenEmpty>
    ) : (
      <KrakenEmpty compact title="Todavía no hay clientes.">
        Crea el primero con «Nuevo cliente»; desde ese momento se puede elegir
        al crear un CV.
      </KrakenEmpty>
    );
  return (
    <ul className="kr-surface divide-y divide-border/60 rounded-xl">
      {customers.map((c) => (
        <li
          key={c.id}
          className={cn(
            "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-0.5 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_8rem_9rem_7rem_auto]",
            !c.isActive && "text-muted-foreground",
          )}
        >
          <Link
            href={`/admin/clientes/${c.id}`}
            className="truncate font-medium after:absolute after:inset-0 hover:underline"
          >
            {c.name}
          </Link>
          <span className="hidden tabular-nums text-muted-foreground sm:block">
            {c.taxId ? `NIT ${c.taxId}` : "Sin NIT"}
          </span>
          <span className="hidden truncate text-muted-foreground sm:block">
            {c.city ?? "—"}
          </span>
          <span className="hidden text-muted-foreground sm:block">
            {c.isActive
              ? `${c.contactCount} ${c.contactCount === 1 ? "contacto" : "contactos"}`
              : "Dado de baja"}
          </span>
          <ChevronRight
            className="size-4 text-muted-foreground"
            aria-hidden="true"
          />
        </li>
      ))}
    </ul>
  );
}
