// src/features/sales-control/line-details.ts
// Reglas de los detalles de una línea (vigencia, seriales, bolsa de horas o contrato por vigencia, alta en catálogo).
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
  termUnitIds?: ReadonlySet<string>;
  isOpeningBalance?: boolean;
};

const NUMBER = /^\d+(\.\d+)?$/;

const CAP_HOURS = /^\d+(\.\d{1,2})?$/;

// REGLA: una línea de HORAS y tipo SERVICIO genera una bolsa al aprobarse; una de SERVICIO en meses o años, un
// contrato por vigencia si el comercial lo marca (§2.4).
export function bagKindOf(
  line: CvLineDraft,
  context: LineDetailContext,
): "HORAS" | "VIGENCIA" | null {
  if (line.kind !== "ITEM" || line.itemType !== "SERVICIO" || !line.unitId)
    return null;
  if (context.hoursUnitIds.has(line.unitId)) return "HORAS";
  return canBeContract(line, context) && line.hourBag?.kind === "VIGENCIA"
    ? "VIGENCIA"
    : null;
}

export function needsHourBag(
  line: CvLineDraft,
  context: LineDetailContext,
): boolean {
  return bagKindOf(line, context) !== null;
}

export function canBeContract(
  line: CvLineDraft,
  context: LineDetailContext,
): boolean {
  return (
    line.kind === "ITEM" &&
    line.itemType === "SERVICIO" &&
    !!line.unitId &&
    !!context.termUnitIds?.has(line.unitId)
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
  issues.push(...activationIssues(line));
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
  const bagKind = bagKindOf(line, context);
  if (bagKind === "HORAS") issues.push(...hourBagIssues(line, quantity));
  if (bagKind === "VIGENCIA") issues.push(...contractIssues(line));
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
          "Un CV de saldo inicial solo lleva líneas de horas de servicio o contratos por vigencia.",
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
  } else issues.push(...scopeIssues(line.hourBag));
  return issues;
}

// REGLA: la vigencia del contrato son las fechas de la línea, obligatorias; el tope es opcional (§2.4).
function contractIssues(line: CvLineDraft): LineIssue[] {
  const issues: LineIssue[] = [];
  if (!line.coverageStart || !line.coverageEnd)
    issues.push({
      field: "coverageStart",
      message: "Un contrato por vigencia necesita inicio y fin de vigencia.",
    });
  const cap = line.hourBag?.capHours ?? null;
  if (
    cap !== null &&
    (!CAP_HOURS.test(cap) ||
      new Decimal(cap).isZero() ||
      toBagMinutes(new Decimal(cap)) === null)
  )
    issues.push({
      field: "hourBag",
      message:
        "El tope son horas mayores a 0 que den minutos enteros, p. ej. 40 o 12.5; vacío = sin tope.",
    });
  if (line.hourBag) issues.push(...scopeIssues(line.hourBag));
  return issues;
}

function scopeIssues(spec: HourBagSpec): LineIssue[] {
  if (spec.scope === "AREA" && spec.areaIds.length === 0)
    return [
      { field: "hourBag", message: "Elige al menos un área para la bolsa." },
    ];
  if (spec.scope === "PROYECTO" && !spec.projectId)
    return [
      {
        field: "hourBag",
        message:
          "Elige el proyecto de la bolsa; si el cliente no tiene, créalo en Tickets → Proyectos.",
      },
    ];
  return [];
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

// REGLA: el rango de activación es opcional y solo de licencias (INTANGIBLE); si se pone, va completo (§2.1).
function activationIssues(line: CvLineDraft): LineIssue[] {
  if (line.itemType !== "INTANGIBLE") return [];
  const field = "activationEnd";
  if (!!line.activationStart !== !!line.activationEnd)
    return [
      { field, message: "Completa el rango de activación: inicio y fin." },
    ];
  if (line.activationEnd < line.activationStart)
    return [
      { field, message: "El rango de activación termina antes de empezar." },
    ];
  return [];
}
