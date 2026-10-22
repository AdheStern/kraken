// src/domain/inventory/net-ticket-materials.test.ts
// Neto de materiales de un ticket: salidas menos devoluciones y seriales que no volvieron (AGENTS.md §2.8).
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { type MaterialLine, netTicketMaterials } from "./net-ticket-materials";

const cable = { productId: "p-cable", code: "CAB-01", description: "Cable" };
const ap = { productId: "p-ap", code: "AP-01", description: "Access point" };

const line = (
  product: typeof cable,
  quantity: string,
  serial: string | null = null,
): MaterialLine => ({ ...product, quantity: new Decimal(quantity), serial });

describe("netTicketMaterials", () => {
  it("resta las devoluciones parciales de lo despachado", () => {
    const result = netTicketMaterials([
      line(cable, "-10.5"),
      line(cable, "-2"),
      line(cable, "3"),
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]?.quantity.toString()).toBe("9.5");
  });

  it("conserva solo los seriales que no volvieron", () => {
    const result = netTicketMaterials([
      line(ap, "-1", "SN-2"),
      line(ap, "-1", "SN-1"),
      line(ap, "1", "SN-2"),
    ]);
    expect(result[0]?.quantity.toString()).toBe("1");
    expect(result[0]?.serials).toEqual(["SN-1"]);
  });

  it("omite lo que se devolvió completo y ordena por código", () => {
    const result = netTicketMaterials([
      line(cable, "-4"),
      line(ap, "-1", "SN-1"),
      line(ap, "1", "SN-1"),
      line(cable, "1"),
    ]);
    expect(result.map((m) => m.code)).toEqual(["CAB-01"]);
  });

  it("sin líneas no hay materiales", () => {
    expect(netTicketMaterials([])).toEqual([]);
  });
});
