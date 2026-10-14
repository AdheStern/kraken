// src/features/sales-control/line-details.ts
// Reglas de los detalles de una línea (vigencia, seriales, bolsa de horas, alta en catálogo).
// Puro: lo usan la grilla para avisar y el servidor para rechazar (AGENTS.md §2.1 y §2.4).
import Decimal from "decimal.js";
import { toBagMinutes } from "@/domain/hours/to-bag-minutes";
import type { LineIssue } from "./line-pricing";
import {
  type CvLineDraft,
  type HourBagSpec,
  hourBagSpecSchema,
} from "./schemas/cv-lines-schema";

export type LineDetailContext = {
  hoursUnitIds: ReadonlySet<string>;
  isOpeningBalance?: boolean;
};

const NUMBER = /^\d+(\.\d+)?$/;

// REGLA: una línea de HORAS y tipo SERVICIO genera una bolsa al aprobarse (§2.4).
export function needsHourBag(
  line: CvLineDraft,
  context: LineDetailContext,
): boolean {
  return (
    line.kind === "ITEM" &&
    line.itemType === "SERVICIO" &&
    !!line.unitId &&
    context.hoursUnitIds.has(line.unitId)
  );
}

export function lineDetailIssues(
  line: CvLineDraft,
  context: LineDetailContext,
): LineIssue[] {
  if (line.kind !== "ITEM") return [];
  const issues: LineIssue[] = [];
  if (
    line.coverageStart &&
    line.coverageEnd &&
    line.coverageEnd < line.coverageStart
  ) {
    issues.push({
      field: "coverageEnd",
      message: "La vigencia termina antes de empezar.",
    });
  }
  if (new Set(line.serials).size !== line.serials.length) {
    issues.push({ field: "serials", message: "Hay seriales repetidos." });
  }
  const quantity = NUMBER.test(line.quantity.trim())
    ? new Decimal(line.quantity.trim())
    : null;
  if (
    quantity &&
    line.serials.length > 0 &&
    quantity.lessThan(line.serials.length)
  ) {
    issues.push({
      field: "serials",
      message: "Hay más seriales que la cantidad de la línea.",
    });
  }
  if (needsHourBag(line, context))
    issues.push(...hourBagIssues(line, quantity));
  if (context.isOpeningBalance)
    issues.push(...openingBalanceIssues(line, context));
  if (line.saveAsProduct && (!line.code || !line.itemType)) {
    issues.push({
      field: "saveAsProduct",
      message: "Para agregarlo al catálogo completa el código y el tipo.",
    });
  }
  return issues;
}

// REGLA: un CV de saldo inicial solo traslada horas ya vendidas antes de Kraken: líneas de horas de servicio
// con costo y venta 0, para no sumar ventas ni márgenes (AGENTS.md §14, F2).
function openingBalanceIssues(
  line: CvLineDraft,
  context: LineDetailContext,
): LineIssue[] {
  if (!needsHourBag(line, context))
    return [
      {
        field: "unitId",
        message:
          "Un CV de saldo inicial solo lleva líneas de horas de servicio.",
      },
    ];
  if (!isZeroOrEmpty(line.unitSaleUsd) || !isZeroOrEmpty(line.unitCostUsd))
    return [
      {
        field: "unitSaleUsd",
        message:
          "En un CV de saldo inicial costo y venta van en 0: son horas ya cobradas.",
      },
    ];
  return [];
}

function isZeroOrEmpty(text: string): boolean {
  const value = text.trim();
  return value === "" || (NUMBER.test(value) && new Decimal(value).isZero());
}

function hourBagIssues(
  line: CvLineDraft,
  quantity: Decimal | null,
): LineIssue[] {
  const issues: LineIssue[] = [];
  if (quantity && toBagMinutes(quantity) === null) {
    issues.push({
      field: "quantity",
      message: "Las horas deben dar minutos enteros, p. ej. 1.5 o 1.25.",
    });
  }
  if (!line.hourBag) {
    issues.push({
      field: "hourBag",
      message: "Define la bolsa de horas: modalidad y alcance.",
    });
  } else if (
    line.hourBag.scope === "AREA" &&
    line.hourBag.areaIds.length === 0
  ) {
    issues.push({
      field: "hourBag",
      message: "Elige al menos un área para la bolsa de horas.",
    });
  } else if (line.hourBag.scope === "PROYECTO" && !line.hourBag.projectId) {
    issues.push({
      field: "hourBag",
      message:
        "El alcance por proyecto llega con los proyectos; usa área o general.",
    });
  }
  return issues;
}

// POR QUÉ: el JSON guardado puede venir de versiones viejas; si no valida se trata como sin bolsa.
// TRAMPA: en la base el vencimiento vacío se guarda como null; el borrador usa "".
export function parseHourBagSpec(value: unknown): HourBagSpec | null {
  if (value === null || value === undefined) return null;
  const stored = typeof value === "object" ? { ...value } : value;
  if (
    stored &&
    typeof stored === "object" &&
    "expiresOn" in stored &&
    stored.expiresOn === null
  ) {
    stored.expiresOn = "";
  }
  const parsed = hourBagSpecSchema.safeParse(stored);
  return parsed.success ? parsed.data : null;
}
