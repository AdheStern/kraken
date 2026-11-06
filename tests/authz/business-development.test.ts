// tests/authz/business-development.test.ts
// Desarrollo de Negocios (decisión 2026-11-06): ve lo mismo que el gerente general (CV con costos, tickets, bolsas,
// inventario valorizado, tableros) sin heredar sus decisiones (aprobar, crear CV, ajustar, metas, cerrar tickets).
import { describe, expect, it } from "vitest";
import {
  canApproveCvs,
  canCreateCv,
  canDecideApproval,
  canEditCvDraft,
  canListCvs,
  canSeeCvCosts,
} from "@/server/authz/cv-permissions";
import {
  canEditGoals,
  canSeeOperationsDashboard,
  canSeeSalesDashboard,
} from "@/server/authz/dashboard-permissions";
import {
  canAdjustHourBag,
  canSeeHourBags,
} from "@/server/authz/hour-bag-permissions";
import {
  canOperateInventory,
  canSeeInventoryCosts,
} from "@/server/authz/inventory-permissions";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvQuery } from "@/server/authz/scope-cv-query";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import {
  canSeeTickets,
  ticketAreasManagedBy,
} from "@/server/authz/ticket-permissions";

const dn: SessionUser = {
  id: "dn",
  name: "Desarrollo",
  email: "dn@dima.test",
  image: null,
  roles: [{ code: "DESARROLLO_NEGOCIOS", areaId: null }],
};

const cv = {
  createdById: "otro",
  sellerIds: ["otro"],
  lineAreaIds: ["a1"],
  isApprovedVersion: false,
};

describe("Desarrollo de Negocios", () => {
  it("ve todos los CV con sus costos, los tickets, las bolsas, el inventario valorizado y los tableros", () => {
    expect(canListCvs(dn)).toBe(true);
    expect(scopeCvQuery(dn)).toEqual({});
    expect(canSeeCvCosts(dn, cv)).toBe(true);
    expect(canSeeTickets(dn)).toBe(true);
    expect(scopeTicketQuery(dn)).toEqual({});
    expect(canSeeHourBags(dn)).toBe(true);
    expect(canSeeInventoryCosts(dn)).toBe(true);
    expect(canSeeSalesDashboard(dn)).toBe(true);
    expect(canSeeOperationsDashboard(dn)).toBe(true);
  });

  it("no decide como el GG", () => {
    expect(canCreateCv(dn)).toBe(false);
    expect(canEditCvDraft(dn, cv)).toBe(false);
    expect(canApproveCvs(dn)).toBe(false);
    expect(
      canDecideApproval(dn, { kind: "GERENCIA_GENERAL", areaId: null }),
    ).toBe(false);
    expect(canAdjustHourBag(dn, { areaIds: ["a1"] })).toBe(false);
    expect(canOperateInventory(dn)).toBe(false);
    expect(canEditGoals(dn)).toBe(false);
    expect(ticketAreasManagedBy(dn)).toEqual([]);
  });
});
