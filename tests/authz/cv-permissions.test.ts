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
  canEditCvHeaderAnyState,
  canEditCvWithholdings,
  canEditPostSaleDetails,
  canExportCvVersion,
  canListCvs,
  canSeeCvCosts,
  canSetCvFinalPrice,
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
  presalesId: null,
  lineAreaIds: [AREA_TEL],
};
const sellerCv: CvAccessFacts = {
  createdById: "otro",
  sellerIds: ["yo"],
  presalesId: null,
  lineAreaIds: [AREA_TEL],
};
const foreignNetCv: CvAccessFacts = {
  createdById: "otro",
  sellerIds: ["otro"],
  presalesId: null,
  lineAreaIds: [AREA_NET],
};
const foreignApprovedCv: CvAccessFacts = {
  ...foreignNetCv,
  lineAreaIds: [AREA_TEL],
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

describe("§2.3 CV aprobado: datos posventa (observaciones, PO#, activación, seriales)", () => {
  it.each<[string, SessionUser, CvAccessFacts, boolean]>([
    ["comercial, vendedor del CV", user(["COMERCIAL"]), sellerCv, true],
    ["comercial, CV ajeno", user(["COMERCIAL"]), foreignNetCv, false],
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
    [
      "administración, CV ajeno",
      user(["ADMINISTRACION"]),
      foreignApprovedCv,
      true,
    ],
    ["ingeniero, CV propio", user(["INGENIERO"]), ownCv, false],
    ["administrador del sistema", user(["ADMIN_SISTEMA"]), ownCv, false],
  ])("%s → %s", (_, u, cv, expected) => {
    expect(canEditPostSaleDetails(u, cv)).toBe(expected);
  });
});

describe("§2.9 CV: ver (listado y navegación)", () => {
  it.each<[string, SessionUser, boolean]>([
    ["comercial", user(["COMERCIAL"]), true],
    ["preventa", user(["PREVENTA"]), true],
    ["gerente de área", user(["GERENTE_AREA", AREA_NET]), true],
    ["gerente general", user(["GERENTE_GENERAL"]), true],
    ["administración", user(["ADMINISTRACION"]), true],
    ["ingeniero (ve sus CV desde el ticket)", user(["INGENIERO"]), false],
    ["administrador del sistema", user(["ADMIN_SISTEMA"]), false],
    ["usuario sin rol", user(), false],
  ])("%s → %s", (_, u, expected) => {
    expect(canListCvs(u)).toBe(expected);
  });
});

describe("§2.3 CV: cabecera en cualquier estado (salvo los TC)", () => {
  it.each<[string, SessionUser, CvAccessFacts, boolean]>([
    [
      "gerente general, CV ajeno",
      user(["GERENTE_GENERAL"]),
      foreignNetCv,
      true,
    ],
    ["administración, CV ajeno", user(["ADMINISTRACION"]), foreignNetCv, true],
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
    ["comercial, CV propio", user(["COMERCIAL"]), ownCv, false],
    ["ingeniero", user(["INGENIERO"]), ownCv, false],
    ["administrador del sistema", user(["ADMIN_SISTEMA"]), ownCv, false],
  ])("%s → %s", (_, u, cv, expected) => {
    expect(canEditCvHeaderAnyState(u, cv)).toBe(expected);
  });
});

describe("§2.3 CV: GROSS UP y RET DIMA en cualquier estado", () => {
  it.each<[string, SessionUser, CvAccessFacts, boolean]>([
    ["gerente general", user(["GERENTE_GENERAL"]), foreignNetCv, true],
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
      "administración, aprobado",
      user(["ADMINISTRACION"]),
      foreignApprovedCv,
      true,
    ],
    [
      "administración, sin aprobar (ve costos desde 2026-11-19)",
      user(["ADMINISTRACION"]),
      foreignNetCv,
      true,
    ],
    [
      "comercial, propio (solo en su borrador)",
      user(["COMERCIAL"]),
      ownCv,
      false,
    ],
    ["ingeniero", user(["INGENIERO"]), ownCv, false],
    ["administrador del sistema", user(["ADMIN_SISTEMA"]), ownCv, false],
  ])("%s → %s", (_, u, cv, expected) => {
    expect(canEditCvWithholdings(u, cv)).toBe(expected);
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
      "administración, no aprobado (decisión 2026-11-19)",
      user(["ADMINISTRACION"]),
      foreignNetCv,
      true,
    ],
    ["administrador del sistema, nunca", user(["ADMIN_SISTEMA"]), ownCv, false],
    [
      "preventa del CV (decisión 2026-11-27)",
      user(["PREVENTA"]),
      { ...foreignNetCv, presalesId: "yo" },
      true,
    ],
    ["preventa ajena", user(["PREVENTA"]), foreignNetCv, false],
    [
      "ingeniero nombrado preventa, nunca",
      user(["INGENIERO"]),
      { ...foreignNetCv, presalesId: "yo" },
      false,
    ],
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
      "administración, borrador (decisión 2026-11-19)",
      user(["ADMINISTRACION"]),
      foreignApprovedCv,
      "BORRADOR",
      true,
    ],
  ])("%s (%s) → %s", (_, u, cv, _status, expected) => {
    expect(canExportCvVersion(u, cv)).toBe(expected);
  });
});

describe("§2.9 CV: ver (Administración ve todas las versiones, decisión 2026-11-19)", () => {
  it("quien entra solo por Administración ve los costos de un borrador ajeno", () => {
    expect(canSeeCvCosts(user(["ADMINISTRACION"]), foreignNetCv)).toBe(true);
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

describe("§2.3 CV: precio final en cualquier estado (decisión 2026-11-19)", () => {
  it.each<[string, SessionUser, boolean]>([
    ["gerente general", user(["GERENTE_GENERAL"]), true],
    ["administración", user(["ADMINISTRACION"]), true],
    [
      "desarrollo de negocios (ve, no decide)",
      user(["DESARROLLO_NEGOCIOS"]),
      false,
    ],
    ["gerente de área", user(["GERENTE_AREA", AREA_NET]), false],
    ["comercial", user(["COMERCIAL"]), false],
    ["ingeniero", user(["INGENIERO"]), false],
    ["administrador del sistema", user(["ADMIN_SISTEMA"]), false],
  ])("%s → %s", (_, u, expected) => {
    expect(canSetCvFinalPrice(u)).toBe(expected);
  });
});
