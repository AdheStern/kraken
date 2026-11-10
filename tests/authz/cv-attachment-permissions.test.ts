// tests/authz/cv-attachment-permissions.test.ts
// Fila «CV: adjuntos» de la tabla de permisos (AGENTS.md §2.9): los ve quien ve costos del CV (regla 12), los sube
// quien además edita el CV o su cabecera y los quita quien los subió o Administración.
import { describe, expect, it } from "vitest";
import type { RoleCode } from "@/generated/prisma/enums";
import {
  canDeleteCvAttachment,
  canSeeCvAttachments,
  canUploadCvAttachment,
} from "@/server/authz/cv-attachment-permissions";
import type { CvAccessFacts } from "@/server/authz/cv-permissions";
import type { SessionUser } from "@/server/authz/roles";

const AREA_NET = "area-dimanet";

function user(...roles: [RoleCode, string?][]): SessionUser {
  return {
    id: "yo",
    name: "Yo",
    email: "yo@dima.test",
    image: null,
    roles: roles.map(([code, areaId]) => ({ code, areaId: areaId ?? null })),
  };
}

const draft: CvAccessFacts = {
  createdById: "otro",
  sellerIds: ["yo"],
  lineAreaIds: [AREA_NET],
  isApprovedVersion: false,
};
const approved: CvAccessFacts = {
  ...draft,
  sellerIds: ["otro"],
  isApprovedVersion: true,
};

describe("§2.9 CV: adjuntos", () => {
  it.each<[string, SessionUser, CvAccessFacts, boolean, boolean]>([
    ["comercial vendedor", user(["COMERCIAL"]), draft, true, true],
    ["comercial ajeno", user(["COMERCIAL"]), approved, false, false],
    [
      "gerente del área de una línea",
      user(["GERENTE_AREA", AREA_NET]),
      approved,
      true,
      true,
    ],
    ["gerente general", user(["GERENTE_GENERAL"]), approved, true, true],
    [
      "Administración en lo aprobado",
      user(["ADMINISTRACION"]),
      approved,
      true,
      true,
    ],
    [
      "Administración en un borrador",
      user(["ADMINISTRACION"]),
      draft,
      false,
      false,
    ],
    [
      "Desarrollo de Negocios (ve, no edita)",
      user(["DESARROLLO_NEGOCIOS"]),
      approved,
      true,
      false,
    ],
    ["preventa (nunca costos)", user(["PREVENTA"]), approved, false, false],
    [
      "ingeniero (regla 12)",
      user(["INGENIERO", AREA_NET]),
      approved,
      false,
      false,
    ],
  ])("%s", (_label, who, cv, sees, uploads) => {
    expect(canSeeCvAttachments(who, cv)).toBe(sees);
    expect(canUploadCvAttachment(who, cv)).toBe(uploads);
  });

  it("quita quien lo subió o Administración; otro gerente que sube, no", () => {
    const manager = user(["GERENTE_AREA", AREA_NET]);
    expect(canDeleteCvAttachment(manager, approved, "yo")).toBe(true);
    expect(canDeleteCvAttachment(manager, approved, "otro")).toBe(false);
    expect(
      canDeleteCvAttachment(user(["ADMINISTRACION"]), approved, "otro"),
    ).toBe(true);
    expect(canDeleteCvAttachment(user(["PREVENTA"]), approved, "yo")).toBe(
      false,
    );
  });
});
