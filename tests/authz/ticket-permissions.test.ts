// tests/authz/ticket-permissions.test.ts
// Tickets (AGENTS.md §2.9): una prueba por celda de "Tickets: ver" y "Tickets: registrar tiempo", más
// crear, gestionar, cerrar y reabrir.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import type { SessionUser } from "@/server/authz/roles";
import { scopeCvHoursQuery } from "@/server/authz/scope-cv-hours-query";
import { scopeProjectQuery } from "@/server/authz/scope-project-query";
import { scopeTicketQuery } from "@/server/authz/scope-ticket-query";
import {
  canCloseTicket,
  canCommentTicket,
  canCreateAnyTicket,
  canLogTime,
  canManageTicket,
  canSeeTickets,
  type TicketAccess,
} from "@/server/authz/ticket-permissions";

function user(...roles: [RoleCode, string?][]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map(([code, areaId]) => ({ code, areaId: areaId ?? null })),
  };
}

const TICKET: TicketAccess = {
  areaIds: ["help", "net"],
  ownerId: "otro",
  subtaskAssigneeIds: [],
};

describe("§2.9 Tickets: ver", () => {
  it("el GG ve todos", () => {
    expect(scopeTicketQuery(user(["GERENTE_GENERAL"]))).toEqual({});
  });

  it.each<RoleCode>([
    "GERENTE_AREA",
    "COORDINADOR_SOPORTE",
  ])("%s ve los de su área", (role) => {
    expect(scopeTicketQuery(user([role, "net"]))).toEqual({
      OR: [{ areas: { some: { areaId: { in: ["net"] } } } }],
    });
  });

  it("el comercial ve los de los clientes de sus CV (creador o vendedor)", () => {
    const scope = JSON.stringify(scopeTicketQuery(user(["COMERCIAL"])));
    expect(scope).toContain('"customer":{"cvs"');
    expect(scope).toContain('"createdById":"yo"');
    expect(scope).toContain('"sellers":{"some":{"userId":"yo"}}');
  });

  it("el ingeniero ve los que tiene a cargo o con una subtarea suya", () => {
    const scope = JSON.stringify(scopeTicketQuery(user(["INGENIERO", "net"])));
    expect(scope).toContain('"ownerId":"yo"');
    expect(scope).toContain('"assigneeId":"yo"');
    expect(scope).not.toContain('"areaId"');
  });

  it.each<RoleCode>([
    "ADMINISTRACION",
    "ADMIN_SISTEMA",
    "ALMACEN",
    "PREVENTA",
  ])("%s no ve ninguno ni entra al módulo", (role) => {
    expect(scopeTicketQuery(user([role, "net"]))).toEqual({ id: { in: [] } });
    expect(canSeeTickets(user([role, "net"]))).toBe(false);
  });
});

describe("§2.9 Tickets: registrar tiempo", () => {
  it("el ingeniero en tickets a cargo y en sus subtareas, no en otros", () => {
    const engineer = user(["INGENIERO", "net"]);
    expect(canLogTime(engineer, { ...TICKET, ownerId: "yo" })).toBe(true);
    expect(
      canLogTime(engineer, { ...TICKET, subtaskAssigneeIds: ["yo"] }),
    ).toBe(true);
    expect(canLogTime(engineer, TICKET)).toBe(false);
  });

  it("el gerente de área en los de su área", () => {
    expect(canLogTime(user(["GERENTE_AREA", "net"]), TICKET)).toBe(true);
    expect(canLogTime(user(["GERENTE_AREA", "doc"]), TICKET)).toBe(false);
  });

  it.each<RoleCode>([
    "COMERCIAL",
    "GERENTE_GENERAL",
    "ADMINISTRACION",
    "COORDINADOR_SOPORTE",
  ])("%s no registra tiempo", (role) => {
    expect(canLogTime(user([role, "net"]), TICKET)).toBe(false);
  });
});

describe("Tickets: crear, gestionar, cerrar y reabrir", () => {
  it("el GG crea y cierra cualquiera", () => {
    expect(canCreateAnyTicket(user(["GERENTE_GENERAL"]))).toBe(true);
    expect(canCloseTicket(user(["GERENTE_GENERAL"]), TICKET)).toBe(true);
  });

  it.each<RoleCode>([
    "COORDINADOR_SOPORTE",
    "GERENTE_AREA",
  ])("%s crea y cierra en su área y no en otra", (role) => {
    expect(canCreateAnyTicket(user([role, "net"]))).toBe(true);
    expect(canCloseTicket(user([role, "net"]), TICKET)).toBe(true);
    expect(canCloseTicket(user([role, "doc"]), TICKET)).toBe(false);
  });

  it.each<RoleCode>([
    "INGENIERO",
    "COMERCIAL",
    "PREVENTA",
    "ADMINISTRACION",
    "ADMIN_SISTEMA",
  ])("%s no crea ni cierra, aunque sea del área", (role) => {
    expect(canCreateAnyTicket(user([role, "help"]))).toBe(false);
    expect(canCloseTicket(user([role, "help"]), TICKET)).toBe(false);
  });

  it("el encargado gestiona y comenta su ticket pero no lo cierra", () => {
    const owner = user(["INGENIERO", "help"]);
    const mine = { ...TICKET, ownerId: "yo" };
    expect(canManageTicket(owner, mine)).toBe(true);
    expect(canCommentTicket(owner, mine)).toBe(true);
    expect(canCloseTicket(owner, mine)).toBe(false);
  });

  it("el comercial consulta sin gestionar ni comentar", () => {
    expect(canManageTicket(user(["COMERCIAL"]), TICKET)).toBe(false);
    expect(canCommentTicket(user(["COMERCIAL"]), TICKET)).toBe(false);
  });
});

describe("§2.9 CV: ver (ingeniero: cabecera y horas de los CV de sus tickets)", () => {
  it("el ingeniero ve los CV de las bolsas de sus tickets", () => {
    const scope = JSON.stringify(scopeCvHoursQuery(user(["INGENIERO", "net"])));
    expect(scope).toContain('"ticketBags"');
    expect(scope).toContain('"ownerId":"yo"');
    expect(scope).toContain('"assigneeId":"yo"');
  });

  it.each<RoleCode>([
    "COMERCIAL",
    "GERENTE_AREA",
    "COORDINADOR_SOPORTE",
    "ADMINISTRACION",
  ])("%s no usa la vista de horas (ve los CV por su propio alcance)", (role) => {
    expect(scopeCvHoursQuery(user([role, "net"]))).toEqual({ id: { in: [] } });
  });
});

describe("Proyectos: ver (misma regla que Tickets: ver)", () => {
  it("el GG ve todos y el coordinador los de su área", () => {
    expect(scopeProjectQuery(user(["GERENTE_GENERAL"]))).toEqual({});
    expect(scopeProjectQuery(user(["COORDINADOR_SOPORTE", "net"]))).toEqual({
      OR: [{ areas: { some: { areaId: { in: ["net"] } } } }],
    });
  });

  it("el ingeniero ve los proyectos de sus tickets y Administración ninguno", () => {
    expect(
      JSON.stringify(scopeProjectQuery(user(["INGENIERO", "net"]))),
    ).toContain('"ownerId":"yo"');
    expect(scopeProjectQuery(user(["ADMINISTRACION"]))).toEqual({
      id: { in: [] },
    });
  });
});
