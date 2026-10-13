// src/features/sales-control/components/versions/reason-dialog.tsx
// Diálogo que pide un motivo o comentario antes de confirmar una acción (versión nueva, anular, aprobar, rechazar).
"use client";

import { LoaderCircle } from "lucide-react";
import { type ReactElement, useState } from "react";
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
import type { ActionResult } from "@/lib/action-result";

type Props = {
  trigger: ReactElement;
  title: string;
  description: string;
  label?: string;
  confirmLabel: string;
  required: boolean;
  destructive?: boolean;
  onConfirm: (text: string) => Promise<ActionResult<unknown>>;
  onDone: () => void;
};

export function ReasonDialog({
  trigger,
  title,
  description,
  label,
  confirmLabel,
  required,
  destructive,
  onConfirm,
  onDone,
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function confirm() {
    setIsPending(true);
    setError(null);
    const result = await onConfirm(text);
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    setText("");
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger} />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {label && (
          <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
            {label}
            <Textarea
              rows={3}
              value={text}
              onChange={(event) => setText(event.target.value)}
              aria-invalid={error ? true : undefined}
            />
          </Label>
        )}
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
            variant={destructive ? "destructive" : "default"}
            onClick={confirm}
            disabled={isPending || (required && text.trim() === "")}
          >
            {isPending && (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
