// src/server/fx/cucu-fx-rate-provider.ts
// TC oficial del BCB desde la API de CUCU (AGENTS.md §2.2): sin clave, 120 consultas por hora por IP. Solo lo
// llama el job fx.fetch-official; nunca una pantalla.
import { z } from "zod";
import type { FxRateProvider, OfficialFxRate } from "./fx-rate-provider";

// TRAMPA: desde el régimen flexible (RD BCB 142/2026) compra = venta = TCO; se guardan igual las dos.
const rateSchema = z.object({
  compra: z.union([z.number().positive(), z.string()]),
  venta: z.union([z.number().positive(), z.string()]),
  vigencia_desde: z.iso.date(),
});

const responseSchema = z.object({
  tc_oficial: rateSchema.extend({ proxima: z.unknown().optional() }),
});

export class CucuFxRateProvider implements FxRateProvider {
  readonly name = "cucu";

  constructor(private readonly url: string) {}

  async fetchOfficial(): Promise<OfficialFxRate[]> {
    const response = await fetch(this.url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error(`La API del TC respondió ${response.status}.`);
    return parseCucuResponse(await response.json());
  }
}

export function parseCucuResponse(body: unknown): OfficialFxRate[] {
  const { tc_oficial } = responseSchema.parse(body);
  const rates = [toRate(tc_oficial)];
  // POR QUÉ: tras las 23:30 la API puede traer el TC de mañana; si su forma no es la esperada, se ignora.
  const next = rateSchema.safeParse(tc_oficial.proxima);
  if (next.success) rates.push(toRate(next.data));
  return rates;
}

function toRate(rate: z.infer<typeof rateSchema>): OfficialFxRate {
  return {
    effectiveOn: rate.vigencia_desde,
    buyRate: String(rate.compra),
    sellRate: String(rate.venta),
  };
}
