// tests/authz/customer-session.test.ts
// Sesión de una cuenta del portal de clientes (AGENTS.md §2.11): solo el rol CLIENTE, con su empresa y su
// configuración; sin empresa activa no entra. El personal de DIMA no cambia.
import { describe, expect, it } from "vitest";
import { canUseDocumentation } from "@/server/authz/documentation-permissions";
import { canRequestTicket } from "@/server/authz/ticket-request-permissions";
import { type ProfileFacts, toSessionUser } from "@/server/session-user";

const authUser = { id: "u1", name: "ACME", email: "soporte@acme.test" };
const customer = {
  id: "c1",
  isActive: true,
  portalSeesBags: true,
  portalRequests: false,
  portalComments: true,
};
const profile = (over: Partial<ProfileFacts> = {}): ProfileFacts => ({
  isActive: true,
  roles: [{ areaId: null, role: { code: "CLIENTE" } }],
  customer,
  ...over,
});

describe("§2.11 sesión de una cuenta de cliente", () => {
  it("trae su empresa y su configuración", () => {
    expect(toSessionUser(authUser, profile())).toMatchObject({
      roles: [{ code: "CLIENTE", areaId: null }],
      customer: {
        customerId: "c1",
        seesBags: true,
        requestsWork: false,
        comments: true,
      },
    });
  });

  it("descarta cualquier rol interno asignado por error", () => {
    const user = toSessionUser(
      authUser,
      profile({
        roles: [
          { areaId: null, role: { code: "CLIENTE" } },
          { areaId: null, role: { code: "GERENTE_GENERAL" } },
        ],
      }),
    );
    expect(user?.roles).toEqual([{ code: "CLIENTE", areaId: null }]);
  });

  it("sin empresa activa o con la cuenta desactivada no entra", () => {
    expect(
      toSessionUser(
        authUser,
        profile({ customer: { ...customer, isActive: false } }),
      ),
    ).toBeNull();
    expect(toSessionUser(authUser, profile({ customer: null }))).toBeNull();
    expect(toSessionUser(authUser, profile({ isActive: false }))).toBeNull();
  });

  it("no pide tickets internos ni usa la documentación", () => {
    const user = toSessionUser(authUser, profile());
    if (!user) throw new Error("sin sesión");
    expect(canRequestTicket(user)).toBe(false);
    expect(canUseDocumentation(user)).toBe(false);
  });

  it("el personal de DIMA conserva sus roles y no trae empresa", () => {
    const user = toSessionUser(
      authUser,
      profile({
        roles: [{ areaId: "a1", role: { code: "INGENIERO" } }],
        customer: null,
      }),
    );
    expect(user).toMatchObject({
      roles: [{ code: "INGENIERO", areaId: "a1" }],
    });
    expect(user?.customer).toBeUndefined();
  });
});
