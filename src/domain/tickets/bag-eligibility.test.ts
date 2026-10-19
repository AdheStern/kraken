// src/domain/tickets/bag-eligibility.test.ts
// Bolsas que acepta la jerarquía de un ticket (AGENTS.md §2.4 alcance, §2.6).
import { describe, expect, it } from "vitest";
import {
  type BagTicket,
  bagIneligibility,
  type EligibleBag,
} from "./bag-eligibility";

const TICKET: BagTicket = {
  customerId: "c1",
  areaIds: ["net"],
  projectId: "p1",
};

const bag = (extra: Partial<EligibleBag> = {}): EligibleBag => ({
  customerId: "c1",
  status: "ACTIVA",
  scope: "AREA",
  areaIds: ["net", "tel"],
  projectId: null,
  ...extra,
});

describe("bagIneligibility", () => {
  it.each<[string, Partial<EligibleBag>]>([
    ["de un área del ticket", {}],
    ["general del cliente", { scope: "GENERAL", areaIds: [] }],
    ["del proyecto del ticket", { scope: "PROYECTO", projectId: "p1" }],
  ])("acepta una bolsa %s", (_, extra) => {
    expect(bagIneligibility(bag(extra), TICKET)).toBeNull();
  });

  it.each<[string, Partial<EligibleBag>]>([
    ["de otro cliente", { customerId: "c2" }],
    ["agotada", { status: "AGOTADA" }],
    ["vencida", { status: "VENCIDA" }],
    ["de otras áreas", { areaIds: ["doc"] }],
    ["de otro proyecto", { scope: "PROYECTO", projectId: "p2" }],
  ])("rechaza una bolsa %s", (_, extra) => {
    expect(bagIneligibility(bag(extra), TICKET)).toEqual(expect.any(String));
  });
});
