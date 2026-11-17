// src/features/admin/components/customer-group-line.tsx
// Bajo el nombre del cliente: su grupo empresarial y enlaces a las empresas hermanas (decisión 2026-11-16).
import { Building2 } from "lucide-react";
import Link from "next/link";
import type { CustomerDetail } from "../types";

export function CustomerGroupLine({
  group,
}: {
  group: CustomerDetail["group"];
}) {
  if (!group) return null;
  return (
    <p className="-mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
      <Building2 className="size-4" aria-hidden="true" />
      <span className="font-medium text-foreground">{group.name}</span>
      {group.siblings.length === 0 ? (
        <span>· todavía sin otras empresas</span>
      ) : (
        <>
          <span>· también:</span>
          {group.siblings.map((sibling, index) => (
            <span key={sibling.id}>
              <Link
                href={`/clientes/${sibling.id}`}
                className="underline-offset-4 hover:text-foreground hover:underline"
              >
                {sibling.name}
              </Link>
              {index < group.siblings.length - 1 && ","}
            </span>
          ))}
        </>
      )}
    </p>
  );
}
