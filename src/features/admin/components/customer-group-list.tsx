// src/features/admin/components/customer-group-list.tsx
// Pestaña «Grupos» de /clientes: una tarjeta por grupo empresarial con sus empresas (abren la ficha) y sus contactos
// activos; las dadas de baja, atenuadas.
import { Building2 } from "lucide-react";
import Link from "next/link";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { cn } from "@/lib/utils";
import type { CustomerGroupRow } from "../queries/list-customer-groups";

type Props = { groups: CustomerGroupRow[]; search: string };

export function CustomerGroupList({ groups, search }: Props) {
  if (groups.length === 0)
    return search ? (
      <KrakenEmpty
        compact
        mood="curious"
        title={`Ningún grupo ni empresa de un grupo coincide con «${search}».`}
      >
        Busca por otra parte del nombre del grupo o de una de sus empresas.
      </KrakenEmpty>
    ) : (
      <KrakenEmpty compact title="Todavía no hay grupos empresariales.">
        Abre la ficha de un cliente y, en «Grupo empresarial», elige «Nuevo
        grupo»; luego asigna el mismo grupo a sus empresas hermanas.
      </KrakenEmpty>
    );
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <li key={group.id} className="kr-surface flex flex-col rounded-xl">
          <div className="flex items-baseline justify-between gap-3 border-b border-border/60 px-4 py-3">
            <h2 className="truncate font-medium">{group.name}</h2>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
              {plural(group.members.length, "empresa", "empresas")}
            </span>
          </div>
          {group.members.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              Sin empresas: asígnalo desde la ficha de un cliente.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {group.members.map((member) => (
                <li
                  key={member.id}
                  className={cn(
                    "relative flex items-center gap-2 px-4 py-2 text-sm",
                    !member.isActive && "text-muted-foreground",
                  )}
                >
                  <Building2
                    className="size-4 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Link
                    href={`/clientes/${member.id}`}
                    className="min-w-0 flex-1 truncate after:absolute after:inset-0 hover:underline"
                  >
                    {member.name}
                  </Link>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {member.isActive
                      ? plural(member.contactCount, "contacto", "contactos")
                      : "Dado de baja"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  );
}

function plural(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}
