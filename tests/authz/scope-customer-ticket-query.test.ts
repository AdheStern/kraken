// tests/authz/scope-customer-ticket-query.test.ts
// Alcances del portal (AGENTS.md §2.11): la cuenta de un cliente ve solo los tickets de su empresa, y sus
// bolsas si su configuración lo permite; el personal de DIMA no entra por aquí.
import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import {
  canSeeCustomerBags,
  scopeCustomerHourBagQuery,
} from "@/server/authz/scope-customer-hour-bag-query";
import { scopeCustomerTicketQuery } from "@/server/authz/scope-customer-ticket-query";
import { canCommentTicket } from "@/server/authz/ticket-permissions";

const base: SessionUser = {
  id: "u1",
  name: "ACME",
  email: "soporte@acme.test",
  image: null,
  roles: [{ code: "CLIENTE", areaId: null }],
};

describe("§2.11 scopeCustomerTicketQuery", () => {
  it("la cuenta de un cliente ve solo los tickets de su empresa", () => {
    const user = {
      ...base,
      customer: {
        customerId: "c1",
        seesBags: false,
        requestsWork: false,
        comments: false,
      },
    };
    expect(scopeCustomerTicketQuery(user)).toEqual({ customerId: "c1" });
  });

  it("sin empresa (personal de DIMA) no ve nada por el portal", () => {
    const gg: SessionUser = {
      ...base,
      roles: [{ code: "GERENTE_GENERAL", areaId: null }],
    };
    expect(scopeCustomerTicketQuery(gg)).toEqual({ id: { in: [] } });
  });
});

describe("§2.11 scopeCustomerHourBagQuery", () => {
  const withBags = (seesBags: boolean): SessionUser => ({
    ...base,
    customer: {
      customerId: "c1",
      seesBags,
      requestsWork: false,
      comments: false,
    },
  });

  it("ve las bolsas de su empresa solo si su configuración lo permite", () => {
    expect(scopeCustomerHourBagQuery(withBags(true))).toEqual({
      customerId: "c1",
    });
    expect(canSeeCustomerBags(withBags(true))).toBe(true);
    expect(scopeCustomerHourBagQuery(withBags(false))).toEqual({
      id: { in: [] },
    });
    expect(canSeeCustomerBags(withBags(false))).toBe(false);
  });
});

describe("§2.11 canCommentTicket para la cuenta de un cliente", () => {
  const account = (comments: boolean): SessionUser => ({
    ...base,
    customer: {
      customerId: "c1",
      seesBags: false,
      requestsWork: false,
      comments,
    },
  });
  const ticket = (customerId: string) => ({
    areaIds: ["a1"],
    ownerId: "ing",
    subtaskAssigneeIds: [],
    customerId,
  });

  it("comenta y adjunta en los de su empresa solo si su configuración lo permite", () => {
    expect(canCommentTicket(account(true), ticket("c1"))).toBe(true);
    expect(canCommentTicket(account(true), ticket("c2"))).toBe(false);
    expect(canCommentTicket(account(false), ticket("c1"))).toBe(false);
  });
});
