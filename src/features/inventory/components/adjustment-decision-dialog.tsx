// src/features/inventory/components/adjustment-decision-dialog.tsx
// Aprobar o rechazar una solicitud de ajuste; rechazar pide comentario (AGENTS.md §2.8).
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
import { decideAdjustment } from "../actions/decide-adjustment";

type Props = { requestId: string; summary: string };

export function AdjustmentDecisionDialog({ requestId, summary }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setPending(approve ? "approve" : "reject");
    setError(null);
    const result = await decideAdjustment({ requestId, approve, comment });
    setPending(null);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Decidir</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Decidir el ajuste</DialogTitle>
          <DialogDescription>
            {summary}. Al aprobarlo entra al kardex con el stock de este
            momento.
          </DialogDescription>
        </DialogHeader>
        <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
          Comentario (obligatorio para rechazar)
          <Textarea
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
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
            variant="outline"
            disabled={pending !== null || comment.trim().length < 5}
            onClick={() => decide(false)}
          >
            {pending === "reject" && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Rechazar
          </Button>
          <Button disabled={pending !== null} onClick={() => decide(true)}>
            {pending === "approve" && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            Aprobar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
