// src/domain/inventory/transfers.test.ts
// Traspaso en dos pasos (AGENTS.md §2.8, §8): transiciones, lo pendiente en TRANSITO por línea y la recepción
// que no supera lo enviado.
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import {
  pendingQuantity,
  settledTransferStatus,
  validateReceipt,
} from "./transfer-pending";
import {
  acceptsSettlement,
  canTransitionTransfer,
  type TransferStatus,
} from "./transfer-state-machine";

const d = (value: number) => new Decimal(value);
const line = (sent: number, received = 0, writtenOff = 0) => ({
  quantitySent: d(sent),
  receivedQuantity: d(received),
  writtenOffQuantity: d(writtenOff),
});

describe("máquina de estados del traspaso", () => {
  it.each<[TransferStatus, TransferStatus]>([
    ["BORRADOR", "EN_TRANSITO"],
    ["BORRADOR", "CANCELADO"],
    ["EN_TRANSITO", "RECIBIDO"],
    ["EN_TRANSITO", "RECIBIDO_CON_DIFERENCIAS"],
    ["RECIBIDO_CON_DIFERENCIAS", "RECIBIDO"],
  ])("%s → %s", (from, to) => {
    expect(canTransitionTransfer(from, to)).toBe(true);
  });

  it.each<[TransferStatus, TransferStatus]>([
    ["EN_TRANSITO", "CANCELADO"],
    ["RECIBIDO", "EN_TRANSITO"],
    ["CANCELADO", "BORRADOR"],
    ["BORRADOR", "RECIBIDO"],
  ])("%s ↛ %s", (from, to) => {
    expect(canTransitionTransfer(from, to)).toBe(false);
  });

  it("admite recepciones y bajas solo mientras algo sigue en camino", () => {
    expect(acceptsSettlement("EN_TRANSITO")).toBe(true);
    expect(acceptsSettlement("RECIBIDO_CON_DIFERENCIAS")).toBe(true);
    expect(acceptsSettlement("BORRADOR")).toBe(false);
    expect(acceptsSettlement("RECIBIDO")).toBe(false);
  });
});

describe("lo pendiente en TRANSITO", () => {
  it("descuenta lo recibido y lo dado de baja", () => {
    expect(pendingQuantity(line(5, 3, 1)).toNumber()).toBe(1);
    expect(() => pendingQuantity(line(5, 4, 2))).toThrow(RangeError);
  });

  it("queda RECIBIDO solo cuando nada sigue pendiente", () => {
    expect(settledTransferStatus([line(5, 5), line(2, 1, 1)])).toBe("RECIBIDO");
    expect(settledTransferStatus([line(5, 5), line(2, 1)])).toBe(
      "RECIBIDO_CON_DIFERENCIAS",
    );
  });

  it("valida la cantidad recibida contra lo pendiente y el serial de a uno", () => {
    const plain = { ...line(5, 3), isSerial: false };
    expect(validateReceipt(plain, d(2))).toBeNull();
    expect(validateReceipt(plain, d(3))).toBe(
      "Se recibe más de lo que queda en tránsito.",
    );
    expect(validateReceipt(plain, d(0))).toMatch(/mayor a 0/);
    expect(validateReceipt(plain, new Decimal("0.001"))).toMatch(/2 decimales/);
    const serial = { ...line(1), isSerial: true };
    expect(validateReceipt(serial, d(1))).toBeNull();
    expect(validateReceipt({ ...line(2), isSerial: true }, d(2))).toBe(
      "Un serial se recibe de a una unidad.",
    );
  });
});
