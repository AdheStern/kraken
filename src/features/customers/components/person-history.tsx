// src/features/customers/components/person-history.tsx
// Historial de una persona de contacto: sus puestos en cada empresa, del actual al más antiguo, con desde/hasta y
// el motivo de salida (decisión 2026-11-06).
import Link from "next/link";
import type { ContactPersonView } from "../types";

export function PersonHistory({
  person,
  canManage,
}: {
  person: ContactPersonView;
  canManage: boolean;
}) {
  return (
    <ol className="grid gap-3 border-l pl-4">
      {person.positions.map((p) => (
        <li key={p.id} className="relative text-sm">
          <span
            aria-hidden="true"
            className={`absolute top-1.5 -left-[1.3rem] size-2 rounded-full ${p.isActive ? "bg-primary" : "bg-muted-foreground"}`}
          />
          <p className="font-medium">
            {p.position ?? "Sin cargo"} ·{" "}
            {canManage ? (
              <Link
                href={`/clientes/${p.customerId}?pestana=contactos`}
                className="underline-offset-4 hover:underline"
              >
                {p.customerName}
              </Link>
            ) : (
              p.customerName
            )}
          </p>
          <p className="text-muted-foreground">
            {[p.email, p.phone, p.municipalityLabel, p.branchName]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="text-xs text-muted-foreground">
            {p.startedOn ?? "…"} → {p.isActive ? "hoy" : (p.endedOn ?? "…")}
            {p.exitReason && ` · ${p.exitReason}`}
            {p.areaCodes.length > 0 && ` · ${p.areaCodes.join(" / ")}`}
            {p.userNames.length > 0 &&
              ` · lo atienden ${p.userNames.join(", ")}`}
          </p>
        </li>
      ))}
    </ol>
  );
}
