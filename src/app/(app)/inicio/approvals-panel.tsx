// src/app/(app)/inicio/approvals-panel.tsx
// Panel de Inicio con las solicitudes que esperan la decisión del usuario, las más antiguas primero (§2.3: sin
// delegación, la antigüedad se ve).
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { PendingApprovalItem } from "@/features/sales-control/types";
import { formatAmount } from "@/lib/format-amount";

const MAX_ITEMS = 4;
const DAY_MS = 86_400_000;

export function ApprovalsPanel({
  items,
  now,
}: {
  items: PendingApprovalItem[];
  now: number;
}) {
  const oldest = [...items].sort((a, b) =>
    a.submittedAt.localeCompare(b.submittedAt),
  );
  return (
    <section
      className="kr-surface flex flex-col rounded-xl"
      aria-labelledby="home-approvals"
    >
      <header className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2 id="home-approvals" className="text-sm font-semibold">
          Esperan tu decisión
        </h2>
        <Link
          href="/aprobaciones"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          Ver bandeja <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </header>
      {oldest.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-muted-foreground">
          Nada pendiente. Cuando un comercial envíe un CV de tu área, aparecerá
          aquí.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 px-2 pb-2">
          {oldest.slice(0, MAX_ITEMS).map((item) => {
            const days = Math.floor(
              (now - Date.parse(item.submittedAt)) / DAY_MS,
            );
            return (
              <li key={item.requestId}>
                <Link
                  href={`/cv/${item.cvId}`}
                  className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-primary/5"
                >
                  <span className="truncate font-medium tabular-nums">
                    {item.versionLabel}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      · {item.title}
                    </span>
                  </span>
                  <span className="text-right text-sm tabular-nums">
                    USD {formatAmount(item.totalSaleUsd)}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {item.customerName} · {item.areaCodes.join(" / ")}
                  </span>
                  <span
                    className={
                      days >= 1
                        ? "text-right text-xs font-medium text-warning"
                        : "text-right text-xs text-muted-foreground"
                    }
                  >
                    {days >= 1 ? `hace ${days} d` : "hoy"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
