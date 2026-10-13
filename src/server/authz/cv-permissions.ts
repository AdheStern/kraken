// src/server/authz/cv-permissions.ts
// Permisos sobre un CV concreto (AGENTS.md §2.9): crear, editar el borrador y ver costos y margen.
// Funciones puras sobre los roles del usuario y los datos mínimos del CV; cada fila de §2.9 tiene su test.
import { areaIdsWithRole, hasRole, type SessionUser } from "./roles";

export type CvAccessFacts = {
  createdById: string;
  sellerIds: readonly string[];
  lineAreaIds: readonly string[];
  hasApprovedVersion: boolean;
};

export function canCreateCv(user: SessionUser): boolean {
  return (
    hasRole(user, "COMERCIAL") ||
    hasRole(user, "GERENTE_AREA") ||
    hasRole(user, "GERENTE_GENERAL")
  );
}

// REGLA: comercial y gerente de área editan sus propios borradores; el GG, todos (§2.9).
export function canEditCvDraft(user: SessionUser, cv: CvAccessFacts): boolean {
  if (hasRole(user, "GERENTE_GENERAL")) return true;
  const canEditOwn =
    hasRole(user, "COMERCIAL") || hasRole(user, "GERENTE_AREA");
  return canEditOwn && isOwnCv(user, cv);
}

// REGLA: un ingeniero nunca recibe costos ni márgenes; ese rol no otorga nada aquí (regla 12).
export function canSeeCvCosts(user: SessionUser, cv: CvAccessFacts): boolean {
  if (hasRole(user, "GERENTE_GENERAL")) return true;
  if (hasRole(user, "COMERCIAL") && isOwnCv(user, cv)) return true;
  const managedAreaIds = areaIdsWithRole(user, "GERENTE_AREA");
  if (cv.lineAreaIds.some((areaId) => managedAreaIds.includes(areaId)))
    return true;
  return hasRole(user, "ADMINISTRACION") && cv.hasApprovedVersion;
}

function isOwnCv(user: SessionUser, cv: CvAccessFacts): boolean {
  return cv.createdById === user.id || cv.sellerIds.includes(user.id);
}

export type ApprovalRequestFacts = {
  kind: "AREA" | "GERENCIA_GENERAL";
  areaId: string | null;
};

// REGLA: la solicitud de un área la decide cualquier gerente de esa área; la del GG, el gerente general (§2.3).
// Sin delegación: nadie más puede decidirlas.
export function canDecideApproval(
  user: SessionUser,
  request: ApprovalRequestFacts,
): boolean {
  if (request.kind === "GERENCIA_GENERAL") {
    return hasRole(user, "GERENTE_GENERAL");
  }
  return (
    request.areaId !== null &&
    areaIdsWithRole(user, "GERENTE_AREA").includes(request.areaId)
  );
}
