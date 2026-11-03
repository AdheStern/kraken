// tests/authz/scope-customer-ticket-query.test.ts
// Alcance de tickets del portal (AGENTS.md §2.11): la cuenta de un cliente ve solo los de su empresa; el
// personal de DIMA no entra por aquí.
import { describe, expect, it } from "vitest";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCustomerTicketQuery } from "@/server/authz/scope-customer-ticket-query";

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
