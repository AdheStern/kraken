// src/features/sales-control/actions/update-cv-header.ts
// Guarda la cabecera de una versión en BORRADOR y vuelve a congelar el snapshot del cliente (§2.1).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canEditCvDraft } from "@/server/authz/cv-permissions";
import { prisma, runInTransaction } from "@/server/db";
import { getSessionUser } from "@/server/session";
import { toCustomerParty } from "../customer-snapshot";
import { loadCvAccess } from "../queries/load-cv-access";
import {
  type CvHeaderInput,
  cvHeaderSchema,
} from "../schemas/cv-header-schema";

const orNull = (value: string) => (value === "" ? null : value);
const dateOrNull = (value: string) => (value === "" ? null : new Date(value));

export async function updateCvHeader(
  input: CvHeaderInput,
): Promise<ActionResult<null>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  const parsed = cvHeaderSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const data = parsed.data;

  const version = await prisma.cvVersion.findUnique({
    where: { id: data.versionId },
    select: { cvId: true, status: true, cv: { select: { customer: true } } },
  });
  if (!version) return actionError("NOT_FOUND", "El CV ya no existe.");
  if (version.status !== "BORRADOR") {
    return actionError(
      "INVALID_STATE",
      "Solo se edita la versión en borrador. Crea una versión nueva para modificarla.",
    );
  }
  const access = await loadCvAccess(version.cvId, data.versionId);
  if (!access || !canEditCvDraft(user, access)) {
    return actionError(
      "FORBIDDEN",
      "Solo el comercial del CV o el gerente general pueden editarlo.",
    );
  }

  try {
    await runInTransaction(async (tx) => {
      const endCustomer = data.endCustomerId
        ? await tx.customer.findUnique({ where: { id: data.endCustomerId } })
        : null;
      const contact = {
        name: data.contactName,
        email: data.contactEmail,
        phone: data.contactPhone,
      };
      await tx.cvVersion.update({
        where: { id: data.versionId },
        data: {
          title: data.title,
          issuedOn: new Date(data.issuedOn),
          presalesId: data.presalesId,
          postsalesId: data.postsalesId,
          mainTechnologyId: data.mainTechnologyId,
          serviceTypeId: data.serviceTypeId,
          isNewTechnology: data.isNewTechnology,
          endCustomerId: endCustomer?.id ?? null,
          customerSnapshot: {
            customer: toCustomerParty(version.cv.customer, contact),
            endCustomer: endCustomer ? toCustomerParty(endCustomer) : null,
          },
          customerPoNumber: orNull(data.customerPoNumber),
          customerPoDate: dateOrNull(data.customerPoDate),
          paymentTerms: orNull(data.paymentTerms),
          deliveryOn: dateOrNull(data.deliveryOn),
          notes: orNull(data.notes),
          costFxRate: data.costFxRate,
          saleFxRate: data.saleFxRate,
        },
      });
      await tx.cvVersionSeller.deleteMany({
        where: { versionId: data.versionId },
      });
      await tx.cvVersionSeller.createMany({
        data: [...new Set(data.sellerIds)].map((userId) => ({
          versionId: data.versionId,
          userId,
        })),
      });
    });
    return actionOk(null);
  } catch (error) {
    return toActionError(error, "updateCvHeader");
  }
}
