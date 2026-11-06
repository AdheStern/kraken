// src/features/admin/components/contact-row.tsx
// Un puesto de contacto: sus datos, municipio y sucursal, áreas, quiénes lo atienden y, si ya no está, desde/hasta
// y el motivo; se edita en un diálogo, se da de baja o se reactiva (decisión 2026-11-06).
"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { setCustomerContactActive } from "../actions/set-customer-contact-active";
import type { ContactFormOptions, CustomerContactView } from "../types";
import { ContactDialog } from "./contact-dialog";
import { TransferContactDialog } from "./transfer-contact-dialog";
import { useAdminAction } from "./use-admin-action";

type Props = {
  customerId: string;
  contact: CustomerContactView;
  options: ContactFormOptions;
};

export function ContactRow({ customerId, contact: c, options }: Props) {
  const { isPending, error, run } = useAdminAction();
  const details = [
    c.position,
    c.email,
    c.phone,
    c.municipalityLabel,
    c.branchName,
  ]
    .filter(Boolean)
    .join(" · ");
  const period =
    c.startedOn || c.endedOn
      ? `${c.startedOn ?? "…"} → ${c.endedOn ?? "hoy"}${c.exitReason ? ` · ${c.exitReason}` : ""}`
      : null;
  return (
    <li className="grid gap-1 px-4 py-2.5">
      <div
        className={cn(
          "flex items-center gap-2 text-sm",
          !c.isActive && "text-muted-foreground",
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">
            <Link
              href={`/clientes/contactos/${c.personId}`}
              className="underline-offset-4 hover:underline"
              title="Ver su historial de empresas"
            >
              {c.name}
            </Link>
          </p>
          {details && (
            <p className="truncate text-muted-foreground">{details}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            {c.areaCodes.map((code) => (
              <Badge key={code} variant="secondary">
                {code}
              </Badge>
            ))}
            {c.userNames.length > 0 && (
              <span>Lo atienden: {c.userNames.join(", ")}</span>
            )}
            {period && <span>{period}</span>}
          </div>
        </div>
        {c.isActive && (
          <TransferContactDialog
            contact={c}
            customers={options.customers}
            currentCustomerId={customerId}
            trigger={
              <Button
                variant="ghost"
                size="sm"
                aria-label={`Transferir a ${c.name}`}
              >
                Transferir
              </Button>
            }
          />
        )}
        {c.isActive && (
          <ContactDialog
            customerId={customerId}
            contact={c}
            options={options}
            trigger={
              <Button variant="ghost" size="sm" aria-label={`Editar ${c.name}`}>
                Editar
              </Button>
            }
          />
        )}
        <Button
          variant="ghost"
          size="sm"
          disabled={isPending}
          aria-label={`${c.isActive ? "Dar de baja" : "Reactivar"} ${c.name}`}
          onClick={() =>
            run(() =>
              setCustomerContactActive({ id: c.id, isActive: !c.isActive }),
            )
          }
        >
          {c.isActive ? "Dar de baja" : "Reactivar"}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </li>
  );
}
