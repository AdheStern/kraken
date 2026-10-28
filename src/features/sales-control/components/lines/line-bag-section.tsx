// src/features/sales-control/components/lines/line-bag-section.tsx
// Sección del detalle de una línea para su bolsa: de horas (unidad de horas) o contrato por vigencia, que el
// comercial marca en una línea de servicio en meses o años (AGENTS.md §2.1, §2.4).
"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { CvLineDraft, HourBagSpec } from "../../schemas/cv-lines-schema";
import type { Option } from "../../types";
import { emptyBagSpec, HourBagFields } from "./hour-bag-fields";

type Props = {
  line: CvLineDraft;
  bagKind: HourBagSpec["kind"] | null;
  canBeContract: boolean;
  areas: Option[];
  projects: Option[];
  disabled: boolean;
  onChange: (hourBag: HourBagSpec | null) => void;
};

export function LineBagSection({
  line,
  bagKind,
  canBeContract,
  areas,
  projects,
  disabled,
  onChange,
}: Props) {
  return (
    <section className="grid gap-2">
      <h3 className="text-sm font-semibold">
        {canBeContract ? "Contrato por vigencia" : "Bolsa de horas"}
      </h3>
      {canBeContract && (
        <Label className="flex items-start gap-2 text-sm font-normal">
          <Checkbox
            checked={bagKind === "VIGENCIA"}
            disabled={disabled}
            onCheckedChange={(checked) =>
              onChange(checked ? emptyBagSpec("VIGENCIA") : null)
            }
          />
          Soporte por vigencia: los tickets del cliente lo usan mientras esté
          vigente, sin descontar horas (o hasta su tope).
        </Label>
      )}
      {bagKind ? (
        <>
          <HourBagFields
            kind={bagKind}
            value={line.hourBag}
            areas={areas}
            projects={projects}
            disabled={disabled}
            onChange={onChange}
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
        !canBeContract && (
          <p className="text-xs text-muted-foreground">
            Solo para líneas de tipo Servicio: en horas generan una bolsa; en
            meses o años pueden ser un contrato por vigencia.
          </p>
        )
      )}
    </section>
  );
}
