// src/features/customers/components/contact-directory.tsx
// Lista del directorio de contactos: persona, cliente, cargo, datos, ubicación, áreas y responsables; cada fila abre
// la ficha de la persona con su historial (decisión 2026-11-06).
import Link from "next/link";
import { KrakenEmpty } from "@/components/brand/kraken-empty";
import { Badge } from "@/components/ui/badge";
import type { DirectoryContact } from "../types";

export function ContactDirectory({
  contacts,
}: {
  contacts: DirectoryContact[];
}) {
  if (contacts.length === 0)
    return (
      <KrakenEmpty title="No hay contactos con esos filtros.">
        Prueba con otro nombre o quita un filtro. Los contactos se registran en
        la ficha de cada cliente.
      </KrakenEmpty>
    );
  return (
    <ul
      data-tour="contactos-lista"
      className="kr-surface divide-y divide-border/60 rounded-xl"
    >
      {contacts.map((c) => (
        <li
          key={c.id}
          className={c.isActive ? undefined : "text-muted-foreground"}
        >
          <Link
            href={`/clientes/contactos/${c.personId}`}
            className="grid gap-1 px-4 py-2.5 text-sm hover:bg-muted/50 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {c.name}
                {!c.isActive && " (anterior)"}
              </span>
              <span className="block truncate text-muted-foreground">
                {[c.position, c.customerName].filter(Boolean).join(" · ")}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block truncate">
                {[c.email, c.phone].filter(Boolean).join(" · ") ||
                  "Sin correo ni teléfono"}
              </span>
              <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                {c.municipalityLabel}
                {c.areaCodes.map((code) => (
                  <Badge key={code} variant="secondary">
                    {code}
                  </Badge>
                ))}
                {c.userNames.length > 0 && (
                  <span>· {c.userNames.join(", ")}</span>
                )}
              </span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
