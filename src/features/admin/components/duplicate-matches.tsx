// src/features/admin/components/duplicate-matches.tsx
// «¿Es alguna de estas personas?»: las coincidencias del contacto nuevo, con qué usar de cada una (agregarle el
// puesto aquí o transferirla desde su empresa) o crear otra persona (decisión 2026-11-06).
"use client";

import { Button } from "@/components/ui/button";
import type {
  ContactMatch,
  MatchReason,
} from "@/domain/customers/contact-matching";

const REASONS: Record<MatchReason, string> = {
  CORREO: "mismo correo",
  TELEFONO: "mismo teléfono",
  NOMBRE: "nombre parecido",
};

type Props = {
  customerId: string;
  matches: ContactMatch[];
  canTransfer: boolean;
  isPending: boolean;
  onPick: (match: ContactMatch) => void;
  onCreateAnyway: () => void;
};

export function DuplicateMatches({
  customerId,
  matches,
  canTransfer,
  isPending,
  onPick,
  onCreateAnyway,
}: Props) {
  return (
    <section
      aria-labelledby="duplicados"
      className="grid gap-2 rounded-lg border border-warning/50 bg-warning/5 p-3"
    >
      <h3 id="duplicados" className="text-sm font-medium">
        ¿Es alguna de estas personas? Así su historial queda en una sola ficha.
      </h3>
      <ul className="grid gap-2">
        {matches.map((m) => {
          const isHere = m.isActive && m.customerId === customerId;
          return (
            <li
              key={m.contactId}
              className="flex flex-wrap items-center gap-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    m.position,
                    m.customerName,
                    m.isActive ? "activo" : "ya no trabaja ahí",
                  ]
                    .filter(Boolean)
                    .join(" · ")}{" "}
                  · {m.reasons.map((r) => REASONS[r]).join(", ")}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={isPending || isHere}
                onClick={() => onPick(m)}
              >
                {isHere
                  ? "Ya es contacto aquí"
                  : canTransfer && m.isActive
                    ? `Transferir desde ${m.customerName}`
                    : "Es esta persona: agregar aquí"}
              </Button>
            </li>
          );
        })}
      </ul>
      <Button
        size="sm"
        variant="ghost"
        className="justify-self-start"
        disabled={isPending}
        onClick={onCreateAnyway}
      >
        Es otra persona: crear un contacto nuevo
      </Button>
    </section>
  );
}
