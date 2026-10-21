// src/features/inventory/components/transfer-list.tsx
// Traspasos: número, origen → destino, estado y lo que sigue en tránsito; cada fila abre su detalle.
import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { TransferRow } from "../types";
import { formatQuantity } from "./inventory-labels";
import { TransferStatusBadge } from "./transfer-status-badge";

const date = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeZone: "America/La_Paz",
});

export function TransferList({ rows }: { rows: TransferRow[] }) {
  return (
    <ul className="kr-solid divide-y divide-border/60 rounded-xl">
      {rows.map((t) => (
        <li key={t.id}>
          <Link
            href={`/inventario/traspasos/${t.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <span className="font-medium tabular-nums">N.º {t.number}</span>
            <span className="flex min-w-0 flex-1 basis-56 items-center gap-1.5 text-sm">
              <span className="truncate">{t.originName}</span>
              <ArrowRight
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-label="hacia"
              />
              <span className="truncate">{t.destinationName}</span>
            </span>
            <span className="text-sm text-muted-foreground tabular-nums">
              {formatQuantity(t.sentQuantity)} u.
              {t.pendingQuantity !== "0.00" &&
                ` · ${formatQuantity(t.pendingQuantity)} en camino`}
              {" · "}
              {date.format(new Date(t.createdAt))}
            </span>
            <TransferStatusBadge status={t.status} />
            <ChevronRight
              className="hidden size-4 text-muted-foreground sm:block"
              aria-hidden="true"
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
