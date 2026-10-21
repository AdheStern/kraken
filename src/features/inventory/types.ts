// src/features/inventory/types.ts
// Tipos de presentación del módulo de inventario (nunca entidades Prisma completas).
import type {
  InvMovementKind,
  ReceiptOrigin,
  WarehouseKind,
} from "@/generated/prisma/enums";

export type CityOption = { id: string; code: string; name: string };

export type WarehouseAdminView = {
  id: string;
  code: string;
  name: string;
  kind: WarehouseKind;
  cityId: string | null;
  cityName: string | null;
  isActive: boolean;
  productsInStock: number;
};

export type WarehouseTab = {
  id: string;
  code: string;
  name: string;
  kind: WarehouseKind;
};

// REGLA: valueUsd y averageCostUsd solo llegan a quien ve costos; para los demás son null (regla 12).
// Cantidades y montos como texto para no pasar por number.
export type StockRow = {
  productId: string;
  productCode: string;
  description: string;
  isSerialized: boolean;
  quantity: string;
  reservedQuantity: string;
  availableQuantity: string;
  valueUsd: string | null;
  averageCostUsd: string | null;
};

export type KardexDocument =
  | { kind: "CV"; label: string; href: string }
  | { kind: "TICKET"; label: string; href: string }
  | { kind: "TRASPASO"; label: string }
  | { kind: "AJUSTE"; label: string }
  | { kind: "DOCUMENTO"; label: string };

export type KardexEntry = {
  lineId: string;
  createdAt: string;
  movementNumber: number;
  movementKind: InvMovementKind;
  receiptOrigin: ReceiptOrigin | null;
  quantity: string;
  unitCostUsd: string;
  valueUsd: string;
  balanceQuantity: string;
  balanceValueUsd: string;
  serial: string | null;
  document: KardexDocument | null;
  notes: string | null;
  actorName: string;
};

export type KardexView = {
  warehouse: WarehouseTab;
  product: { id: string; code: string; description: string };
  stock: StockRow;
  entries: KardexEntry[];
};

// POR QUÉ: el POS nunca necesita costos; viaja solo lo que se puede despachar (regla 12).
export type PosCatalogItem = {
  productId: string;
  code: string;
  description: string;
  isSerialized: boolean;
  availableQuantity: string;
  serials: string[];
};

export type PendingReservation = {
  reservationId: string;
  cvLabel: string;
  customerName: string;
  productId: string;
  productCode: string;
  lineDescription: string;
  pendingQuantity: string;
};

export type DispatchTicket = {
  id: string;
  number: number;
  title: string;
  customerName: string;
};

export type TransferStatusCode =
  | "BORRADOR"
  | "EN_TRANSITO"
  | "RECIBIDO"
  | "RECIBIDO_CON_DIFERENCIAS"
  | "CANCELADO";

export type TransferRow = {
  id: string;
  number: number;
  status: TransferStatusCode;
  originName: string;
  destinationName: string;
  createdAt: string;
  sentQuantity: string;
  pendingQuantity: string;
};

export type TransferLineView = {
  productId: string;
  id: string;
  productCode: string;
  description: string;
  serial: string | null;
  sentQuantity: string;
  receivedQuantity: string;
  writtenOffQuantity: string;
  pendingQuantity: string;
};

export type TransferDetail = Omit<
  TransferRow,
  "sentQuantity" | "pendingQuantity"
> & {
  transitWarehouseId: string;
  notes: string | null;
  createdByName: string;
  sentAt: string | null;
  receivedAt: string | null;
  lines: TransferLineView[];
};

export type AdjustmentRequestView = {
  id: string;
  status: "PENDIENTE" | "APROBADO" | "RECHAZADO";
  origin: "MANUAL" | "CONTEO" | "TRASPASO";
  warehouseName: string;
  areaName: string | null;
  reason: string;
  requestedByName: string;
  createdAt: string;
  decidedByName: string | null;
  decisionComment: string | null;
  canDecide: boolean;
  lines: {
    productCode: string;
    description: string;
    delta: string;
    serials: string[];
  }[];
};
