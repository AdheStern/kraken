// tests/authz/cv-permissions.test.ts
// Filas de CV de la tabla de permisos (AGENTS.md §2.9): crear/editar borrador y ver costos y margen.
// La fila "CV: ver" se prueba contra la base en tests/integration/cv-scope.int.test.ts.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import {
  type CvAccessFacts,
  canCreateCv,
  canDecideApproval,
  canEditCvDraft,
  canExportCvVersion,
  canSeeCvCosts,
  seesOnlyApprovedVersions,
} from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";

const AREA_NET = "area-dimanet";
const AREA_TEL = "area-dimatel";

function user(...roles: [RoleCode, string?][]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map(([code, areaId]) => ({ code, areaId: areaId ?? null })),
  };
}

const ownCv: CvAccessFacts = {
  createdById: "yo",
  sellerIds: [],
  lineAreaIds: [AREA_TEL],
  isApprovedVersion: false,
};
const sellerCv: CvAccessFacts = {
  createdById: "otro",
  sellerIds: ["yo"],
  lineAreaIds: [AREA_TEL],
  isApprovedVersion: false,
};
const foreignNetCv: CvAccessFacts = {
  createdById: "otro",
  sellerIds: ["otro"],
  lineAreaIds: [AREA_NET],
  isApprovedVersion: false,
};
const foreignApprovedCv: CvAccessFacts = {
  ...foreignNetCv,
  lineAreaIds: [AREA_TEL],
  isApprovedVersion: true,
};

describe("§2.9 CV: crear y editar borrador", () => {
  it.each<[string, SessionUser, boolean]>([
    ["comercial", user(["COMERCIAL"]), true],
    ["gerente de área", user(["GERENTE_AREA", AREA_NET]), true],
    ["gerente general", user(["GERENTE_GENERAL"]), true],
    ["ingeniero", user(["INGENIERO"]), false],
    ["administración", user(["ADMINISTRACION"]), false],
    ["administrador del sistema", user(["ADMIN_SISTEMA"]), false],
  ])("crear: %s → %s", (_, u, expected) => {
    expect(canCreateCv(u)).toBe(expected);
  });

  it.each<[string, SessionUser, CvAccessFacts, boolean]>([
    ["comercial, CV propio", user(["COMERCIAL"]), ownCv, true],
    ["comercial, vendedor del CV", user(["COMERCIAL"]), sellerCv, true],
    ["comercial, CV ajeno", user(["COMERCIAL"]), foreignNetCv, false],
    [
      "gerente de área, CV propio",
      user(["GERENTE_AREA", AREA_NET]),
      ownCv,
      true,
    ],
    [
      "gerente de área, CV ajeno de su área",
      user(["GERENTE_AREA", AREA_NET]),
      foreignNetCv,
      false,
    ],
    [
      "gerente general, CV ajeno",
      user(["GERENTE_GENERAL"]),
      foreignNetCv,
      true,
    ],
    ["ingeniero, CV propio", user(["INGENIERO"]), ownCv, false],
    [
      "administración, CV aprobado",
      user(["ADMINISTRACION"]),
      foreignApprovedCv,
      false,
    ],
  ])("editar: %s → %s", (_, u, cv, expected) => {
    expect(canEditCvDraft(u, cv)).toBe(expected);
  });
});

describe("§2.9 CV: costos y margen", () => {
  it.each<[string, SessionUser, CvAccessFacts, boolean]>([
    ["comercial, propio", user(["COMERCIAL"]), ownCv, true],
    ["comercial, ajeno", user(["COMERCIAL"]), foreignNetCv, false],
    [
      "gerente de área, CV con línea de su área",
      user(["GERENTE_AREA", AREA_NET]),
      foreignNetCv,
      true,
    ],
    [
      "gerente de área, CV de otra área",
      user(["GERENTE_AREA", AREA_NET]),
      sellerCv,
      false,
    ],
    [
      "gerente general, cualquiera",
      user(["GERENTE_GENERAL"]),
      foreignNetCv,
      true,
    ],
    ["ingeniero, nunca", user(["INGENIERO"]), ownCv, false],
    [
      "administración, aprobado",
      user(["ADMINISTRACION"]),
      foreignApprovedCv,
      true,
    ],
    [
      "administración, no aprobado",
      user(["ADMINISTRACION"]),
      foreignNetCv,
      false,
    ],
    ["administrador del sistema, nunca", user(["ADMIN_SISTEMA"]), ownCv, false],
  ])("%s → %s", (_, u, cv, expected) => {
    expect(canSeeCvCosts(u, cv)).toBe(expected);
  });

  it("los permisos se suman: ingeniero y gerente de área ve costos de su área", () => {
    const u = user(["INGENIERO"], ["GERENTE_AREA", AREA_NET]);
    expect(canSeeCvCosts(u, foreignNetCv)).toBe(true);
  });
});

describe("§2.9 CV: exportar Excel", () => {
  it.each<[string, SessionUser, CvAccessFacts, string, boolean]>([
    [
      "comercial, propio en borrador",
      user(["COMERCIAL"]),
      ownCv,
      "BORRADOR",
      true,
    ],
    [
      "comercial, ajeno",
      user(["COMERCIAL"]),
      foreignApprovedCv,
      "APROBADA",
      false,
    ],
    [
      "gerente general, cualquiera",
      user(["GERENTE_GENERAL"]),
      foreignNetCv,
      "BORRADOR",
      true,
    ],
    ["ingeniero, nunca", user(["INGENIERO"]), ownCv, "APROBADA", false],
    [
      "administración, versión aprobada",
      user(["ADMINISTRACION"]),
      foreignApprovedCv,
      "APROBADA",
      true,
    ],
    [
      "administración, versión reemplazada",
      user(["ADMINISTRACION"]),
      foreignApprovedCv,
      "REEMPLAZADA",
      true,
    ],
    [
      "administración, borrador de un CV aprobado",
      user(["ADMINISTRACION"]),
      foreignApprovedCv,
      "BORRADOR",
      false,
    ],
  ])("%s → %s", (_, u, cv, status, expected) => {
    const isApprovedVersion = status === "APROBADA" || status === "REEMPLAZADA";
    expect(canExportCvVersion(u, { ...cv, isApprovedVersion })).toBe(expected);
  });
});

describe("§2.9 CV: ver (versiones de Administración)", () => {
  it("quien entra solo por Administración ve solo las versiones aprobadas", () => {
    expect(
      seesOnlyApprovedVersions(user(["ADMINISTRACION"]), foreignApprovedCv),
    ).toBe(true);
  });

  it.each<[string, SessionUser, CvAccessFacts]>([
    [
      "administración y vendedor",
      user(["ADMINISTRACION"], ["COMERCIAL"]),
      sellerCv,
    ],
    [
      "administración y gerente del área",
      user(["ADMINISTRACION"], ["GERENTE_AREA", AREA_NET]),
      foreignNetCv,
    ],
    [
      "administración y preventa",
      user(["ADMINISTRACION"], ["PREVENTA"]),
      foreignNetCv,
    ],
    ["comercial", user(["COMERCIAL"]), ownCv],
    ["gerente general", user(["GERENTE_GENERAL"]), foreignNetCv],
  ])("%s ve todas las versiones", (_, u, cv) => {
    expect(seesOnlyApprovedVersions(u, cv)).toBe(false);
  });

  it("el gerente de área ve los costos de todo el CV si tiene una línea de su área (decisión 2026-10-24)", () => {
    const mixed = { ...foreignNetCv, lineAreaIds: [AREA_NET, AREA_TEL] };
    expect(canSeeCvCosts(user(["GERENTE_AREA", AREA_NET]), mixed)).toBe(true);
  });
});

describe("§2.9 CV: aprobar", () => {
  const areaRequest = { kind: "AREA" as const, areaId: AREA_NET };
  const ggRequest = { kind: "GERENCIA_GENERAL" as const, areaId: null };

  it.each<[string, SessionUser, boolean, boolean]>([
    ["gerente de su área", user(["GERENTE_AREA", AREA_NET]), true, false],
    ["gerente de otra área", user(["GERENTE_AREA", AREA_TEL]), false, false],
    ["gerente general", user(["GERENTE_GENERAL"]), false, true],
    ["comercial", user(["COMERCIAL"]), false, false],
    ["administración", user(["ADMINISTRACION"]), false, false],
    [
      "gerente de área y GG",
      user(["GERENTE_AREA", AREA_NET], ["GERENTE_GENERAL"]),
      true,
      true,
    ],
  ])("%s → área %s, GG %s", (_, u, area, gg) => {
    expect(canDecideApproval(u, areaRequest)).toBe(area);
    expect(canDecideApproval(u, ggRequest)).toBe(gg);
  });
});
