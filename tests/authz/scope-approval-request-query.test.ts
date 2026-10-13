// tests/authz/scope-approval-request-query.test.ts
// Alcance de la bandeja de aprobaciones (AGENTS.md §2.9, "CV: aprobar") y de la bandeja de avisos.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import { scopeApprovalRequestQuery } from "@/server/authz/scope-approval-request-query";
import { scopeInboxQuery } from "@/server/authz/scope-inbox-query";

function user(...roles: [RoleCode, string?][]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map(([code, areaId]) => ({ code, areaId: areaId ?? null })),
  };
}

describe("§2.9 CV: aprobar — bandeja de aprobaciones", () => {
  it("el gerente de área ve las solicitudes de sus áreas", () => {
    expect(
      scopeApprovalRequestQuery(
        user(["GERENTE_AREA", "net"], ["GERENTE_AREA", "tel"]),
      ),
    ).toEqual({
      OR: [{ kind: "AREA", areaId: { in: ["net", "tel"] } }],
    });
  });

  it("el gerente general ve las de gerencia general", () => {
    expect(scopeApprovalRequestQuery(user(["GERENTE_GENERAL"]))).toEqual({
      OR: [{ kind: "GERENCIA_GENERAL" }],
    });
  });

  it("los permisos se suman: GG y gerente de área", () => {
    const scope = scopeApprovalRequestQuery(
      user(["GERENTE_GENERAL"], ["GERENTE_AREA", "net"]),
    );
    expect(scope.OR).toHaveLength(2);
  });

  it.each<RoleCode>([
    "COMERCIAL",
    "INGENIERO",
    "ADMINISTRACION",
    "ADMIN_SISTEMA",
  ])("%s no ve ninguna", (role) => {
    expect(scopeApprovalRequestQuery(user([role]))).toEqual({ id: { in: [] } });
  });
});

describe("bandeja de avisos", () => {
  it("cada usuario ve solo sus avisos", () => {
    expect(scopeInboxQuery(user(["GERENTE_GENERAL"]))).toEqual({
      userId: "yo",
    });
  });
});
