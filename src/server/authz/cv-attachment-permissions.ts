// src/server/authz/cv-attachment-permissions.ts
// Adjuntos de un CV (AGENTS.md §2.1, §2.9): los ve quien ve costos del CV, porque un adjunto puede ser una
// cotización con costos (regla 12); los sube quien además edita el CV o su cabecera, y los quita quien los subió o
// Administración. Son del CV, no de una versión: se gestionan en cualquier estado.
import {
  type CvAccessFacts,
  canEditCvDraft,
  canEditCvHeaderAnyState,
  canEditPostSaleDetails,
  canSeeCvCosts,
} from "./cv-permissions";
import { hasRole, type SessionUser } from "./roles";

export function canSeeCvAttachments(
  user: SessionUser,
  cv: CvAccessFacts,
): boolean {
  return canSeeCvCosts(user, cv);
}

export function canUploadCvAttachment(
  user: SessionUser,
  cv: CvAccessFacts,
): boolean {
  return (
    canSeeCvAttachments(user, cv) &&
    (canEditCvDraft(user, cv) ||
      canEditCvHeaderAnyState(user, cv) ||
      canEditPostSaleDetails(user, cv))
  );
}

export function canDeleteCvAttachment(
  user: SessionUser,
  cv: CvAccessFacts,
  uploadedById: string,
): boolean {
  return (
    canUploadCvAttachment(user, cv) &&
    (uploadedById === user.id || hasRole(user, "ADMINISTRACION"))
  );
}
