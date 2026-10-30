// src/features/admin/components/fx-manual-form.tsx
// Carga manual del TC oficial de una fecha, para cuando el job no lo obtuvo del BCB.
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { setManualFxRate } from "../actions/set-manual-fx-rate";
import { LabeledInput } from "./labeled-input";
import { useAdminAction } from "./use-admin-action";

export function FxManualForm({ today }: { today: string }) {
  const { isPending, error, run } = useAdminAction();
  const [saved, setSaved] = useState(false);
  const [draft, setDraft] = useState({
    effectiveOn: today,
    buyRate: "",
    sellRate: "",
  });

  return (
    <form
      className="kr-surface grid gap-4 rounded-xl p-5 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
      onSubmit={async (event) => {
        event.preventDefault();
        setSaved(false);
        const ok = await run(() => setManualFxRate(draft));
        if (ok) setDraft({ ...draft, buyRate: "", sellRate: "" });
        setSaved(ok);
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor="tc-rige-desde">Rige desde</Label>
        <DatePicker
          id="tc-rige-desde"
          max={today}
          value={draft.effectiveOn}
          onChange={(effectiveOn) => setDraft({ ...draft, effectiveOn })}
        />
      </div>
      <LabeledInput
        label="TC oficial (compra)"
        inputMode="decimal"
        placeholder="11.68"
        value={draft.buyRate}
        onChange={(buyRate) => setDraft({ ...draft, buyRate })}
      />
      <LabeledInput
        label="Venta (si difiere)"
        inputMode="decimal"
        placeholder="Igual a la compra"
        value={draft.sellRate}
        onChange={(sellRate) => setDraft({ ...draft, sellRate })}
      />
      <Button type="submit" disabled={isPending}>
        {isPending && (
          <LoaderCircle className="animate-spin" aria-hidden="true" />
        )}
        Cargar TC
      </Button>
      {(saved || error) && (
        <p
          role={error ? "alert" : "status"}
          className={`text-sm sm:col-span-4 ${error ? "text-destructive" : "text-muted-foreground"}`}
        >
          {error ??
            "Cargado. Si el BCB publica ese mismo día, su TC tiene prioridad sobre el manual."}
        </p>
      )}
    </form>
  );
}
