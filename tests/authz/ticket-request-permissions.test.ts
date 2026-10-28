// tests/authz/ticket-request-permissions.test.ts
// Solicitudes de ticket (AGENTS.md §2.9): una prueba por celda de "Solicitudes: crear", "Solicitudes: atender"
// y su alcance de visibilidad.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import { scopeTicketRequestQuery } from "@/server/authz/scope-ticket-request-query";
import {
  canHandleAnyTicketRequest,
  canHandleTicketRequest,
  canRequestTicket,
} from "@/server/authz/ticket-request-permissions";

function user(...roles: [RoleCode, string?][]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map(([code, areaId]) => ({ code, areaId: areaId ?? null })),
  };
}

describe("§2.9 Solicitudes: crear", () => {
  it.each<RoleCode>([
    "GERENTE_GENERAL",
    "GERENTE_AREA",
    "COMERCIAL",
    "PREVENTA",
    "INGENIERO",
    "COORDINADOR_SOPORTE",
    "ALMACEN",
    "ADMINISTRACION",
    "ADMIN_SISTEMA",
  ])("%s pide un ticket", (role) => {
    expect(canRequestTicket(user([role]))).toBe(true);
  });

  it("sin rol no pide", () => {
    expect(canRequestTicket(user())).toBe(false);
  });
});

describe("§2.9 Solicitudes: atender", () => {
  it("el GG atiende las de cualquier área", () => {
    expect(
      canHandleTicketRequest(user(["GERENTE_GENERAL"]), { areaId: "net" }),
    ).toBe(true);
  });

  it.each<RoleCode>([
    "COORDINADOR_SOPORTE",
    "GERENTE_AREA",
  ])("%s atiende las de su área y no las de otra", (role) => {
    const u = user([role, "net"]);
    expect(canHandleTicketRequest(u, { areaId: "net" })).toBe(true);
    expect(canHandleTicketRequest(u, { areaId: "tel" })).toBe(false);
    expect(canHandleAnyTicketRequest(u)).toBe(true);
  });

  it.each<RoleCode>([
    "COMERCIAL",
    "INGENIERO",
    "ADMINISTRACION",
    "ADMIN_SISTEMA",
  ])("%s no atiende", (role) => {
    const u = user([role, "net"]);
    expect(canHandleTicketRequest(u, { areaId: "net" })).toBe(false);
    expect(canHandleAnyTicketRequest(u)).toBe(false);
  });
});

describe("§2.9 Solicitudes: ver", () => {
  it("el GG ve todas", () => {
    expect(scopeTicketRequestQuery(user(["GERENTE_GENERAL"]))).toEqual({});
  });

  it("quien atiende ve las suyas y las de sus áreas", () => {
    expect(
      scopeTicketRequestQuery(user(["COORDINADOR_SOPORTE", "net"])),
    ).toEqual({ OR: [{ requesterId: "yo" }, { areaId: { in: ["net"] } }] });
  });

  it("los demás ven solo las suyas", () => {
    expect(scopeTicketRequestQuery(user(["INGENIERO", "net"]))).toEqual({
      OR: [{ requesterId: "yo" }],
    });
  });
});
