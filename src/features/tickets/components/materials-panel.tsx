// src/features/tickets/components/materials-panel.tsx
// Materiales que Almacén despachó al ticket: lo que tiene hoy (salidas menos devoluciones) y los comprobantes
// (AGENTS.md §2.8). Solo cantidades: nunca costos (regla 12).
import { FileDown } from "lucide-react";
import type { TicketMaterials } from "@/features/inventory/queries/list-ticket-materials";
import { formatDateTime } from "./ticket-dates";

const KIND_LABEL = { SALIDA: "Salida", DEVOLUCION: "Devolución" } as const;

export function MaterialsPanel({ materials }: { materials: TicketMaterials }) {
  if (materials.documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sin materiales despachados. Almacén los registra desde el POS eligiendo
        este ticket como destino.
      </p>
    );
  }
  return (
    <div className="flex flex-col gap-5">
      {materials.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Todo lo despachado a este ticket ya fue devuelto al almacén.
        </p>
      ) : (
        <ul className="kr-solid divide-y divide-border/60 rounded-xl">
          {materials.items.map((item) => (
            <li key={item.code} className="flex gap-3 px-4 py-3 text-sm">
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{item.description}</span>
                <span className="text-xs text-muted-foreground">
                  {item.code}
                  {item.serials.length > 0 && ` · ${item.serials.join(", ")}`}
                </span>
              </span>
              <span className="font-medium tabular-nums">{item.quantity}</span>
            </li>
          ))}
        </ul>
      )}
      <section className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Comprobantes</h3>
        <ul className="divide-y divide-border/60 rounded-xl border border-border/60">
          {materials.documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm"
            >
              <span className="min-w-0 flex-1">
                {KIND_LABEL[doc.kind]} N.º {doc.number}
                <span className="block text-xs text-muted-foreground">
                  {doc.warehouse} · {doc.actor} ·{" "}
                  {formatDateTime(doc.createdAt)}
                </span>
              </span>
              {materials.canDownloadReceipts && (
                <a
                  href={`/api/inventory/receipts/${doc.id}.pdf`}
                  className="inline-flex items-center gap-1.5 text-primary underline-offset-4 hover:underline"
                >
                  <FileDown className="size-4" aria-hidden="true" />
                  Comprobante
                </a>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
