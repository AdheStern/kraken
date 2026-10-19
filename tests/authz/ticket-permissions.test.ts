// tests/authz/ticket-permissions.test.ts
// Tickets (AGENTS.md §2.9): quién cierra y reabre; una prueba por rol.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import { canCloseTicket } from "@/server/authz/ticket-permissions";

function user(...roles: [RoleCode, string?][]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map(([code, areaId]) => ({ code, areaId: areaId ?? null })),
  };
}

const TICKET = { areaIds: ["help", "net"] };

describe("§2.9 Tickets: cerrar y reabrir", () => {
  it("el GG cierra cualquiera", () => {
    expect(canCloseTicket(user(["GERENTE_GENERAL"]), TICKET)).toBe(true);
  });

  it.each<RoleCode>([
    "COORDINADOR_SOPORTE",
    "GERENTE_AREA",
  ])("%s cierra los de su área y no los de otra", (role) => {
    expect(canCloseTicket(user([role, "net"]), TICKET)).toBe(true);
    expect(canCloseTicket(user([role, "doc"]), TICKET)).toBe(false);
  });

  it.each<RoleCode>([
    "INGENIERO",
    "COMERCIAL",
    "PREVENTA",
    "ADMINISTRACION",
    "ADMIN_SISTEMA",
  ])("%s no cierra, aunque sea del área", (role) => {
    expect(canCloseTicket(user([role, "help"]), TICKET)).toBe(false);
  });
});
