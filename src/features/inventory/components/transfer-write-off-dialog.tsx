// src/features/inventory/components/transfer-write-off-dialog.tsx
// Pide dar de baja lo que no llegó de un traspaso: una solicitud de ajuste en tránsito, por lo pendiente de cada
// línea, que aprueba Administración o el GG (AGENTS.md §2.8).
"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requestAdjustment } from "../actions/request-adjustment";
import type { TransferDetail } from "../types";

export function TransferWriteOffDialog({
  transfer,
}: {
  transfer: TransferDetail;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = transfer.lines.filter((l) => l.pendingQuantity !== "0.00");

  async function submit() {
    setIsPending(true);
    setError(null);
    const result = await requestAdjustment({
      warehouseId: transfer.transitWarehouseId,
      areaId: null,
      origin: "TRASPASO",
      reason: `Traspaso N.º ${transfer.number}: ${reason}`,
      lines: pending.map((l) => ({
        productId: l.productId,
        delta: `-${l.pendingQuantity}`,
        unitCostUsd: null,
        serials: [],
        transferLineId: l.id,
        systemQuantity: null,
      })),
    });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    router.push("/inventario/ajustes");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" />}>
        Dar de baja lo que falta
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dar de baja lo que no llegó</DialogTitle>
          <DialogDescription>
            Se pide un ajuste por lo que sigue en camino; entra al kardex cuando
            lo aprueban Administración o el GG.
          </DialogDescription>
        </DialogHeader>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Qué pasó
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Label>
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={isPending || reason.trim().length < 5}
            onClick={submit}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Pedir la baja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
