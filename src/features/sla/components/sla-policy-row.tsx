// src/features/sla/components/sla-policy-row.tsx
// Fila editable de una política de SLA: horas de primera respuesta y de resolución, activa o no.
"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAdminAction } from "@/features/admin/components/use-admin-action";
import { upsertSlaPolicy } from "../actions/upsert-sla-policy";
import type { SlaPolicyRow as Row } from "../types";

const PRIORITY_LABELS = {
  CRITICA: "Crítica",
  ALTA: "Alta",
  MEDIA: "Media",
  BAJA: "Baja",
} as const;
const toHours = (minutes: number | null) =>
  minutes === null ? "" : String(Number((minutes / 60).toFixed(2)));

export function SlaPolicyRow({ row }: { row: Row }) {
  const [first, setFirst] = useState(toHours(row.firstResponseMinutes));
  const [resolution, setResolution] = useState(toHours(row.resolutionMinutes));
  const [isActive, setIsActive] = useState(row.isActive);
  const { run, isPending, error } = useAdminAction();
  const id = `${row.modality}-${row.priority}`;
  const isDirty =
    first !== toHours(row.firstResponseMinutes) ||
    resolution !== toHours(row.resolutionMinutes) ||
    isActive !== row.isActive;

  return (
    <li className="flex flex-col gap-2 px-4 py-3">
      <div className="grid items-end gap-3 sm:grid-cols-[6rem_minmax(0,12rem)_minmax(0,12rem)_auto_auto] sm:justify-start">
        <span className="text-sm font-medium">
          {PRIORITY_LABELS[row.priority]}
        </span>
        <Label className="grid gap-1 text-[13px] font-normal text-muted-foreground">
          Primera respuesta (h)
          <Input
            id={`${id}-first`}
            inputMode="decimal"
            className="tabular-nums"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
          />
        </Label>
        <Label className="grid gap-1 text-[13px] font-normal text-muted-foreground">
          Resolución (h)
          <Input
            id={`${id}-resolution`}
            inputMode="decimal"
            className="tabular-nums"
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
          />
        </Label>
        <Label className="flex h-9 items-center gap-2 text-sm font-normal">
          <Checkbox
            checked={isActive}
            onCheckedChange={(v) => setIsActive(v === true)}
          />
          Activa
        </Label>
        <Button
          size="sm"
          disabled={!isDirty || isPending}
          onClick={() =>
            run(() =>
              upsertSlaPolicy({
                modality: row.modality,
                priority: row.priority,
                firstResponseHours: first,
                resolutionHours: resolution,
                isActive,
              }),
            )
          }
        >
          {isPending && (
            <LoaderCircle className="animate-spin" aria-hidden="true" />
          )}
          Guardar
        </Button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </li>
  );
}
