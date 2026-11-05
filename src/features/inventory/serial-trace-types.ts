// src/features/inventory/serial-trace-types.ts
// Tipos de presentación del recorrido de un serial (AGENTS.md §2.8): sin costos; cada parte filtrada por su alcance.
import type { KardexDocument } from "./types";

export type SerialTraceEvent = {
  id: string;
  kind: "INGRESO" | "SALIDA" | "TRASPASO" | "AJUSTE" | "DEVOLUCION";
  number: number;
  createdAt: string;
  warehouse: string;
  isIn: boolean;
  document: KardexDocument | null;
};

export type SerialTrace = {
  serial: string;
  units: {
    id: string;
    serial: string;
    code: string;
    description: string;
    status: "EN_STOCK" | "EN_TRANSITO" | "RESERVADO" | "DESPACHADO" | "BAJA";
    warehouse: string | null;
    events: SerialTraceEvent[];
  }[];
  sales: {
    cvId: string;
    cvLabel: string;
    versionStatus: string;
    customerName: string;
    description: string;
    coverageStart: string | null;
    coverageEnd: string | null;
  }[];
};
