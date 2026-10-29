// src/app/(app)/inventario/traspasos/[id]/page.tsx
// Detalle de un traspaso: pasos, origen y destino, lo que sigue en camino por línea y la acción que toca (enviar,
// cancelar o recibir) (AGENTS.md §2.8, §8).
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { z } from "zod";
import { Skeleton } from "@/components/ui/skeleton";
import { TransferDraftActions } from "@/features/inventory/components/transfer-draft-actions";
import { TransferLinesTable } from "@/features/inventory/components/transfer-lines-table";
import { TransferReceiveForm } from "@/features/inventory/components/transfer-receive-form";
import { TransferStatusBadge } from "@/features/inventory/components/transfer-status-badge";
import { TransferSteps } from "@/features/inventory/components/transfer-steps";
import { TransferWriteOffDialog } from "@/features/inventory/components/transfer-write-off-dialog";
import { getTransfer } from "@/features/inventory/queries/get-transfer";
import { requireUser } from "@/server/session";

// POR QUÉ: cache() comparte la lectura entre el título de la pestaña y la página.
const loadTransfer = cache(async (id: string) =>
  z.uuid().safeParse(id).success ? getTransfer(await requireUser(), id) : null,
);

export async function generateMetadata({
  params,
}: PageProps<"/inventario/traspasos/[id]">): Promise<Metadata> {
  const transfer = await loadTransfer((await params).id);
  return { title: transfer ? `Traspaso N.º ${transfer.number}` : "Traspaso" };
}

const date = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export default function TransferPage({
  params,
}: PageProps<"/inventario/traspasos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-8 sm:px-6">
      <Link
        href="/inventario/traspasos"
        className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Traspasos
      </Link>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <Transfer params={params} />
      </Suspense>
    </main>
  );
}

async function Transfer({
  params,
}: Pick<PageProps<"/inventario/traspasos/[id]">, "params">) {
  const transfer = await loadTransfer((await params).id);
  if (!transfer) notFound();
  const canReceive =
    transfer.status === "EN_TRANSITO" ||
    transfer.status === "RECIBIDO_CON_DIFERENCIAS";
  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
              Traspaso N.º {transfer.number}
            </h1>
            <TransferStatusBadge status={transfer.status} />
          </div>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            {transfer.originName}
            <ArrowRight className="size-3.5" aria-label="hacia" />
            {transfer.destinationName} · creó {transfer.createdByName} el{" "}
            {date.format(new Date(transfer.createdAt))}
            {transfer.sentAt &&
              ` · enviado el ${date.format(new Date(transfer.sentAt))}`}
          </p>
          {transfer.notes && <p className="text-sm">{transfer.notes}</p>}
        </div>
        {transfer.status === "BORRADOR" && (
          <TransferDraftActions transferId={transfer.id} />
        )}
      </header>
      <TransferSteps status={transfer.status} />
      <TransferLinesTable lines={transfer.lines} />
      {canReceive && (
        <TransferReceiveForm
          key={transfer.lines.map((l) => l.pendingQuantity).join()}
          transferId={transfer.id}
          lines={transfer.lines}
        />
      )}
      {transfer.status === "RECIBIDO_CON_DIFERENCIAS" && (
        <TransferWriteOffDialog transfer={transfer} />
      )}
      {transfer.status === "RECIBIDO_CON_DIFERENCIAS" && (
        <p className="rounded-lg bg-warning/10 px-3 py-2 text-sm text-warning">
          Lo que sigue en camino queda en el almacén de tránsito. Recíbelo
          cuando llegue o pide un ajuste para darlo de baja si se perdió.
        </p>
      )}
    </>
  );
}
