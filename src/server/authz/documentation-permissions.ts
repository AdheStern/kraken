// src/server/authz/documentation-permissions.ts
// Permisos de la documentación por proyecto (AGENTS.md §2.10, §2.9): la información es pública dentro de DIMA.
import { canManageSystem } from "./admin-permissions";
import { hasRole, type SessionUser } from "./roles";

// REGLA: todo usuario con al menos un rol ve, crea proyectos, edita su cabecera y sube documentos (§2.10).
export function canUseDocumentation(user: SessionUser): boolean {
  return user.roles.length > 0;
}

// REGLA: quitar un documento es de quien lo subió o del administrador del sistema (§2.10).
export function canDeleteDocument(
  user: SessionUser,
  document: { uploadedById: string },
): boolean {
  return document.uploadedById === user.id || hasRole(user, "ADMIN_SISTEMA");
}

// REGLA: las fases son un catálogo de estructura; las gestiona el administrador del sistema (§2.10).
export function canManageDocPhases(user: SessionUser): boolean {
  return canManageSystem(user);
}
