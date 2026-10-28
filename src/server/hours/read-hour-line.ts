// src/server/hours/read-hour-line.ts
// Lee una línea de SERVICIO de una versión como bolsa a abrir: horas (unidad de horas) o contrato por vigencia
// (unidad de plazo marcada por el comercial), con sus minutos y su especificación (AGENTS.md §2.1, §2.4).
import Decimal from "decimal.js";
import type { BagSpec } from "@/domain/hours/plan-version-bags";
import { toBagMinutes } from "@/domain/hours/to-bag-minutes";
import { readBagSpec } from "./read-bag-spec";

export type StoredHourLine = {
  quantity: { toString(): string } | null;
  hourBagSpec: unknown;
  coverageStart: Date | null;
  coverageEnd: Date | null;
  unit: { isHours: boolean; isTerm: boolean } | null;
};

export type ReadHourLine =
  | { kind: "BAG"; spec: BagSpec; minutes: number }
  | { kind: "SKIP" }
  | { kind: "INVALID" };

const HOURS = /^\d+(\.\d{1,2})?$/;

export function readHourLine(line: StoredHourLine): ReadHourLine {
  const stored = readBagSpec(line.hourBagSpec);
  if (line.unit?.isHours) {
    const minutes = toMinutes(line.quantity?.toString() ?? null);
    if (!stored || minutes === null) return { kind: "INVALID" };
    return {
      kind: "BAG",
      spec: { ...withoutCap(stored), kind: "HORAS" },
      minutes,
    };
  }
  // POR QUÉ: una línea en meses o años solo es contrato si el comercial marcó «Soporte por vigencia».
  if (stored?.kind !== "VIGENCIA") return { kind: "SKIP" };
  const startsOn = toDateText(line.coverageStart);
  const expiresOn = toDateText(line.coverageEnd);
  const isUncapped = stored.capHours === null;
  const minutes = isUncapped ? 0 : toMinutes(stored.capHours);
  if (
    !startsOn ||
    !expiresOn ||
    minutes === null ||
    (!isUncapped && minutes === 0)
  )
    return { kind: "INVALID" };
  return {
    kind: "BAG",
    spec: { ...withoutCap(stored), startsOn, expiresOn, isUncapped },
    minutes,
  };
}

// REGLA: el tope de un contrato son sus minutos de línea; sin tope, 0 (§2.4, delta de versiones).
export function contractCapMinutes(hourBagSpec: unknown): number {
  const stored = readBagSpec(hourBagSpec);
  return stored?.capHours ? (toMinutes(stored.capHours) ?? 0) : 0;
}

function toMinutes(hours: string | null): number | null {
  if (hours === null || !HOURS.test(hours.trim())) return null;
  return toBagMinutes(new Decimal(hours.trim()));
}

function toDateText(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function withoutCap({
  capHours: _,
  ...spec
}: BagSpec & { capHours: string | null }): BagSpec {
  return spec;
}
