// src/server/fx/fx-rate-provider.ts
// Contrato de la fuente del TC oficial (Adapter, AGENTS.md §9 L, ADR-09): hoy CUCU; mañana otra sin tocar
// el job.

// POR QUÉ: compra y venta en texto, tal como llegan, para guardarlas exactas en NUMERIC(12,4) (§15.4).
export type OfficialFxRate = {
  effectiveOn: string;
  buyRate: string;
  sellRate: string;
};

export interface FxRateProvider {
  readonly name: string;
  // El vigente y, si ya se publicó, el que rige mañana.
  fetchOfficial(): Promise<OfficialFxRate[]>;
}
