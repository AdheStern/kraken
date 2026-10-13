// src/features/sales-control/components/approvals/approval-inbox.tsx
// Bandeja de aprobaciones: pendientes con antigüedad, monto y áreas; la solicitud propia resaltada y el
// comparador desde la v2 (AGENTS.md §5). Sin delegación: lo que espera más de 24 h se marca (§2.3, §7).
import { ArrowRight, Clock, GitCompareArrows } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatAmount } from "@/lib/format-amount";
import type { PendingApprovalItem } from "../../types";

// REGLA: approvals.reminder recuerda las solicitudes con más de 24 h (AGENTS.md §7).
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function ApprovalInbox({
  items,
  now,
}: {
  items: PendingApprovalItem[];
  now: number;
}) {
  if (items.length === 0) {
    return (
      <p className="rounded-xl border border-dashed px-6 py-12 text-center text-sm text-muted-foreground">
        No tienes aprobaciones pendientes. Cuando un comercial envíe un CV con
        líneas de tu área, aparecerá aquí y te llegará un aviso.
      </p>
    );
  }
  return (
    <ul className="divide-y rounded-xl border bg-card">
      {items.map((item) => (
        <InboxRow key={item.requestId} item={item} now={now} />
      ))}
    </ul>
  );
}

function InboxRow({ item, now }: { item: PendingApprovalItem; now: number }) {
  const waitedMs = now - new Date(item.submittedAt).getTime();
  const isStale = waitedMs > STALE_AFTER_MS;
  return (
    <li className="grid gap-3 px-5 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <div className="grid min-w-0 gap-1">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <Link
            href={`/cv/${item.cvId}`}
            className="font-semibold tabular-nums hover:underline"
          >
            {item.versionLabel}
          </Link>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            Te toca como {item.requestLabel}
          </span>
          <span
            className={`flex items-center gap-1 text-xs ${isStale ? "font-medium text-warning" : "text-muted-foreground"}`}
          >
            <Clock className="size-3.5" aria-hidden="true" />
            Esperando {formatWait(waitedMs)}
          </span>
        </div>
        <p className="truncate text-sm text-muted-foreground">
          {item.title} · {item.customerName}
        </p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <span className="text-sm font-medium text-foreground tabular-nums">
            USD {formatAmount(item.totalSaleUsd)}
          </span>
          <span aria-hidden="true">·</span>
          Áreas: {item.areaCodes.join(", ")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {item.versionNumber > 1 && (
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={
              <Link
                href={`/cv/${item.cvId}/comparar?de=${item.versionNumber - 1}&a=${item.versionNumber}`}
              />
            }
          >
            <GitCompareArrows aria-hidden="true" />
            Qué cambió
          </Button>
        )}
        <Button
          size="sm"
          nativeButton={false}
          render={<Link href={`/cv/${item.cvId}`} />}
        >
          Revisar y decidir
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </li>
  );
}

function formatWait(ms: number): string {
  const minutes = Math.max(1, Math.floor(ms / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 día" : `${days} días`;
}
