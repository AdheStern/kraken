// src/features/sales-control/components/cv-hours-view.tsx
// CV visto por el ingeniero: cabecera y líneas de horas con su bolsa, sin montos (AGENTS.md §2.9, regla 12).
import Link from "next/link";
import { NodeMark } from "@/components/app-shell/node-mark";
import { formatMinutes } from "@/lib/format-minutes";
import type { CvHoursView as CvHoursViewData } from "../types";

const MODALITY = { H8X5: "8x5", H24X7: "24x7" } as const;
const STATUS = {
  ACTIVA: "Activa",
  AGOTADA: "Agotada",
  VENCIDA: "Vencida",
  CERRADA: "Cerrada",
} as const;

export function CvHoursView({ cv }: { cv: CvHoursViewData }) {
  return (
    <>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <NodeMark />
        <h1 className="text-2xl font-semibold tracking-[-0.02em] tabular-nums">
          {cv.label}
        </h1>
        <p className="basis-full text-sm text-muted-foreground">
          {cv.title} · {cv.customerName} · {cv.cityName}
          {cv.sellerNames.length > 0 &&
            ` · Vende: ${cv.sellerNames.join(", ")}`}
        </p>
        <p className="basis-full text-sm text-muted-foreground">
          Ves las horas de servicio de este CV porque alimenta tus tickets; los
          montos los ven el comercial y gerencia.
        </p>
      </header>
      <ul className="kr-solid divide-y divide-border/60 rounded-xl">
        {cv.lines.map((line) => (
          <li
            key={line.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <span className="min-w-0">
              <span className="block font-medium">{line.description}</span>
              <span className="text-xs text-muted-foreground">
                {[
                  line.areaCode,
                  line.modality && MODALITY[line.modality],
                  line.expiresOn && `vence ${line.expiresOn}`,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </span>
            <span className="flex items-center gap-4 tabular-nums">
              <span>
                {line.isContract
                  ? `Contrato · ${line.hours ? `tope ${line.hours} h` : "sin tope"}`
                  : `${line.hours} h vendidas`}
              </span>
              {line.bag && (
                <Link
                  href={`/horas/${line.bag.id}`}
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {line.bag.isUncapped
                    ? `Usado ${formatMinutes(0 - line.bag.balanceMinutes)}`
                    : `Saldo ${formatMinutes(line.bag.balanceMinutes)}`}{" "}
                  · {STATUS[line.bag.status]}
                </Link>
              )}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
