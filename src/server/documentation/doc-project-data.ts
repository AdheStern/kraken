// src/server/documentation/doc-project-data.ts
// Valida contra la base la cabecera de un proyecto de documentación y la lleva a las columnas (AGENTS.md §2.10).
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import type { Tx } from "@/server/db";

export type DocProjectFields = {
  name: string;
  customerId: string;
  contactId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  technologyIds: string[];
  ownerId: string;
};

export type DocProjectData = Omit<
  DocProjectFields,
  "technologyIds" | "contactName" | "contactEmail" | "contactPhone"
> & {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
};

// TRAMPA: el contacto debe ser del cliente elegido; el formulario lo limpia al cambiar de cliente, pero la
// action no confía en eso. Un cliente dado de baja solo se acepta si el proyecto ya lo tenía.
export async function toDocProjectData(
  tx: Tx,
  input: DocProjectFields,
  currentCustomerId: string | null,
): Promise<ActionResult<DocProjectData>> {
  const [customer, contact, owner, technologies] = await Promise.all([
    tx.customer.findUnique({ where: { id: input.customerId } }),
    input.contactId
      ? tx.customerContact.findFirst({
          where: { id: input.contactId, customerId: input.customerId },
        })
      : null,
    tx.userProfile.findUnique({ where: { userId: input.ownerId } }),
    tx.technology.count({ where: { id: { in: input.technologyIds } } }),
  ]);
  if (!customer || (!customer.isActive && customer.id !== currentCustomerId))
    return actionError("VALIDATION", "Elige un cliente activo.");
  if (input.contactId && !contact)
    return actionError("VALIDATION", "El contacto no es de ese cliente.");
  if (!owner?.isActive)
    return actionError("VALIDATION", "Elige un encargado activo.");
  if (technologies !== new Set(input.technologyIds).size)
    return actionError("VALIDATION", "Alguna tecnología ya no existe.");
  return actionOk({
    name: input.name,
    customerId: input.customerId,
    contactId: input.contactId,
    contactName: input.contactName || null,
    contactEmail: input.contactEmail || null,
    contactPhone: input.contactPhone || null,
    ownerId: input.ownerId,
  });
}
