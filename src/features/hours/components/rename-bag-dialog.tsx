// src/features/hours/components/rename-bag-dialog.tsx
// Pone o quita el nombre visible de una bolsa; vacío vuelve a mostrar la descripción de su línea del CV
// (AGENTS.md §2.4). Solo cambia lo que se muestra, no el saldo.
"use client";

import { LoaderCircle, Pencil } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { renameHourBag } from "../actions/rename-hour-bag";

type Props = {
  bagId: string;
  customName: string | null;
  lineDescription: string;
};

export function RenameBagDialog({ bagId, customName, lineDescription }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(customName ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  function changeOpen(next: boolean) {
    setOpen(next);
    if (next) {
      setName(customName ?? "");
      setError(null);
    }
  }

  async function confirm() {
    setIsPending(true);
    setError(null);
    const result = await renameHourBag({ bagId, name });
    setIsPending(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Pencil aria-hidden="true" />
        Cambiar nombre
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nombre de la bolsa</DialogTitle>
          <DialogDescription>
            Es el nombre que ven los técnicos en los tickets y en las bolsas.
            Déjalo vacío para volver a «{lineDescription}», la descripción de la
            línea del CV.
          </DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            void confirm();
          }}
        >
          <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
            Nombre
            <Input
              value={name}
              maxLength={120}
              placeholder={lineDescription}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={error ? true : undefined}
              autoFocus
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
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <LoaderCircle className="animate-spin" aria-hidden="true" />
              )}
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
