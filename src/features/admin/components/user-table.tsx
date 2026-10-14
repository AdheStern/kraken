// src/features/admin/components/user-table.tsx
// Listado de usuarios: foto, nombre y correo (abren la ficha), ciudad y roles; los dados de baja, atenuados.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { PersonAvatar } from "@/components/app-shell/person-avatar";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { cn } from "@/lib/utils";
import type { UserRow } from "../types";
import { RoleChip } from "./role-chip";

type Props = { users: UserRow[]; search: string };

export function UserTable({ users, search }: Props) {
  if (users.length === 0)
    return search ? (
      <KrakenEmpty
        compact
        mood="curious"
        title={`Nadie coincide con «${search}».`}
      >
        Busca por otra parte del nombre o del correo.
      </KrakenEmpty>
    ) : (
      <KrakenEmpty compact title="Todavía no entró nadie.">
        Cada persona aparece aquí la primera vez que entra con su cuenta de
        Microsoft; entonces se le asignan sus roles.
      </KrakenEmpty>
    );
  return (
    <ul className="kr-surface divide-y divide-border/60 rounded-xl">
      {users.map((u) => (
        <li
          key={u.id}
          className={cn(
            "relative flex items-center gap-3 px-4 py-3 text-sm",
            !u.isActive && "text-muted-foreground opacity-80",
          )}
        >
          <PersonAvatar name={u.name} image={u.image} />
          <div className="min-w-0 flex-1 sm:flex-none sm:basis-64">
            <Link
              href={`/admin/usuarios/${u.id}`}
              className="block truncate font-medium after:absolute after:inset-0 hover:underline"
            >
              {u.name}
            </Link>
            <p className="truncate text-muted-foreground">{u.email}</p>
          </div>
          <span className="hidden w-10 text-muted-foreground sm:block">
            {u.city ?? "—"}
          </span>
          <div className="hidden min-w-0 flex-1 flex-wrap gap-1.5 sm:flex">
            {!u.isActive ? (
              <span className="text-muted-foreground">Dado de baja</span>
            ) : u.roles.length === 0 ? (
              <span className="text-warning">Sin roles: no ve nada</span>
            ) : (
              u.roles.map((r) => <RoleChip key={r.id} role={r} />)
            )}
          </div>
          <ChevronRight
            className="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </li>
      ))}
    </ul>
  );
}
