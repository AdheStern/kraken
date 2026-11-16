// src/features/sales-control/actions/find-cv-contact-options.ts
// Contactos de otro cliente final elegido en la cabecera, para el contacto de soporte y licencias (decisión
// 2026-11-16). Solo para quien edita la cabecera de esa versión (§2.3).
"use server";

import { z } from "zod";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import {
  canEditCvDraft,
  canEditCvHeaderAnyState,
} from "@/server/authz/cv-permissions";
import { prisma } from "@/server/db";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import { getSessionUser } from "@/server/session";
import { getCvContactOptions } from "../queries/get-cv-contact-options";
import type { CvContactOption } from "../types";

const schema = z.object({ versionId: z.uuid(), customerId: z.uuid() });

export async function findCvContactOptions(
  input: z.input<typeof schema>,
): Promise<ActionResult<CvContactOption[]>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", "Elige un cliente final válido.");
  try {
    const { versionId, customerId } = parsed.data;
    const version = await prisma.cvVersion.findUnique({
      where: { id: versionId },
      select: { cvId: true },
    });
    const access = version && (await loadCvAccess(version.cvId, versionId));
    if (!access) return actionError("NOT_FOUND", "El CV ya no existe.");
    if (!canEditCvDraft(user, access) && !canEditCvHeaderAnyState(user, access))
      return actionError(
        "FORBIDDEN",
        "Solo quien edita la cabecera del CV ve estos contactos.",
      );
    return actionOk(await getCvContactOptions(customerId));
  } catch (error) {
    return toActionError(error, "findCvContactOptions");
  }
}
