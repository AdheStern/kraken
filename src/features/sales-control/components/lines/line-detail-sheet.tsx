// src/features/sales-control/components/lines/line-detail-sheet.tsx
// Panel lateral con los detalles de una línea que no caben en la grilla: vigencia, seriales,
// bolsa de horas y alta del producto en el catálogo (AGENTS.md §2.1).
"use client";

import { CircleAlert } from "lucide-react";
import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type { LineIssue } from "../../line-pricing";
import type { CvLineDraft } from "../../schemas/cv-lines-schema";
import type { Option } from "../../types";
import { HourBagFields } from "./hour-bag-fields";

type Props = {
  line: CvLineDraft | null;
  row: number;
  needsHourBag: boolean;
  issues: LineIssue[];
  areas: Option[];
  canEdit: boolean;
  onChange: (patch: Partial<CvLineDraft>) => void;
  onClose: () => void;
};

export function LineDetailSheet({
  line,
  row,
  needsHourBag,
  issues,
  areas,
  canEdit,
  onChange,
  onClose,
}: Props) {
  const disabled = !canEdit;
  return (
    <Sheet open={line !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        {line && (
          <>
            <SheetHeader>
              <SheetTitle>Detalle de la línea {row + 1}</SheetTitle>
              <SheetDescription className="line-clamp-2">
                {line.description || "Línea sin descripción"}
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-6 px-4 pb-6">
              {issues.length > 0 && (
                <ul
                  className="grid gap-1 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
                  role="alert"
                >
                  {issues.map((issue) => (
                    <li key={issue.message} className="flex gap-2">
                      <CircleAlert className="mt-0.5 size-4 shrink-0" />
                      {issue.message}
                    </li>
                  ))}
                </ul>
              )}
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Vigencia</h3>
                <p className="text-xs text-muted-foreground">
                  Para soporte, suscripciones y licencias; alimenta el tablero
                  de renovaciones.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
                    Inicio
                    <DatePicker
                      value={line.coverageStart}
                      disabled={disabled}
                      clearable
                      placeholder="Sin fecha"
                      aria-label="Inicio de la vigencia"
                      onChange={(coverageStart) => onChange({ coverageStart })}
                    />
                  </Label>
                  <Label className="grid gap-1.5 text-[13px] font-normal text-muted-foreground">
                    Fin
                    <DatePicker
                      value={line.coverageEnd}
                      disabled={disabled}
                      clearable
                      placeholder="Sin fecha"
                      aria-label="Fin de la vigencia"
                      min={line.coverageStart || undefined}
                      onChange={(coverageEnd) => onChange({ coverageEnd })}
                    />
                  </Label>
                </div>
              </section>
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Seriales</h3>
                <Textarea
                  rows={5}
                  disabled={disabled}
                  placeholder="Uno por línea. Puedes pegarlos desde Excel."
                  key={line.key}
                  defaultValue={line.serials.join("\n")}
                  onChange={(e) =>
                    onChange({
                      serials: e.target.value
                        .split(/[\r\n\t,;]+/)
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground tabular-nums">
                  {line.serials.length} seriales · cantidad{" "}
                  {line.quantity || "—"}
                </p>
              </section>
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Bolsa de horas</h3>
                {needsHourBag ? (
                  <>
                    <HourBagFields
                      value={line.hourBag}
                      areas={areas}
                      disabled={disabled}
                      onChange={(hourBag) => onChange({ hourBag })}
                    />
                    {line.id && (
                      <Link
                        href={`/horas/linea/${line.id}`}
                        className="w-fit text-sm text-primary underline-offset-4 hover:underline"
                      >
                        Ver bolsa y su libro
                      </Link>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Solo para líneas con unidad en horas y tipo Servicio: al
                    aprobarse generan una bolsa.
                  </p>
                )}
              </section>
              <section className="grid gap-2">
                <h3 className="text-sm font-semibold">Catálogo</h3>
                {line.productId ? (
                  <p className="text-sm text-muted-foreground">
                    Producto del catálogo:{" "}
                    <span className="font-medium text-foreground">
                      {line.code}
                    </span>
                  </p>
                ) : (
                  <Label className="flex items-start gap-2 text-sm font-normal">
                    <Checkbox
                      checked={line.saveAsProduct}
                      disabled={disabled}
                      onCheckedChange={(checked) =>
                        onChange({ saveAsProduct: checked === true })
                      }
                    />
                    Agregar al catálogo como producto nuevo. Queda marcado
                    «creado desde CV» para revisión.
                  </Label>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
