// src/features/sales-control/actions/update-cv-header.ts
// Guarda la cabecera de una versión y vuelve a congelar el snapshot del cliente (§2.1). En el borrador la edita su
// comercial con los TC; en cualquier estado, gerentes y Administración sin los TC (§2.3, decisión 2026-11-03).
"use server";

import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import {
  canEditCvDraft,
  canEditCvHeaderAnyState,
} from "@/server/authz/cv-permissions";
import { prisma, runInTransaction } from "@/server/db";
import { lockVersion } from "@/server/sales-control/approvers";
import { loadCvAccess } from "@/server/sales-control/cv-access";
import { saveCvHeader } from "@/server/sales-control/save-cv-header";
import { getSessionUser } from "@/server/session";
import { toCustomerParty } from "../customer-snapshot";
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
    select: { cvId: true, cv: { select: { customer: true } } },
  });
  if (!version) return actionError("NOT_FOUND", "El CV ya no existe.");
  const access = await loadCvAccess(version.cvId, data.versionId);
  if (!access) return actionError("NOT_FOUND", "El CV ya no existe.");

  try {
    return await runInTransaction(async (tx) => {
      await lockVersion(tx, data.versionId);
      const current = await tx.cvVersion.findUniqueOrThrow({
        where: { id: data.versionId },
        select: { status: true, costFxRate: true, saleFxRate: true },
      });
      const isDraft = current.status === "BORRADOR";
      const fullDraft = isDraft && canEditCvDraft(user, access);
      if (!fullDraft && !canEditCvHeaderAnyState(user, access))
        return actionError(
          isDraft ? "FORBIDDEN" : "INVALID_STATE",
          isDraft
            ? "Solo el comercial del CV, sus gerentes o Administración pueden editarlo."
            : "Solo el borrador se edita. Para cambiarlo, crea una versión nueva.",
        );
      // REGLA: el TC de costo y el de venta solo los cambia quien edita el borrador completo (§2.3).
      if (
        !fullDraft &&
        (!current.costFxRate.equals(data.costFxRate) ||
          !current.saleFxRate.equals(data.saleFxRate))
      )
        return actionError(
          "VALIDATION",
          "El TC de costo y el de venta no se modifican aquí; solo en el borrador, por su comercial.",
        );
      const endCustomer = data.endCustomerId
        ? await tx.customer.findUnique({ where: { id: data.endCustomerId } })
        : null;
      const contact = {
        name: data.contactName,
        email: data.contactEmail,
        phone: data.contactPhone,
        address: data.contactAddress,
      };
      await saveCvHeader(tx, {
        versionId: data.versionId,
        cvId: version.cvId,
        isDraft,
        sellerIds: data.sellerIds,
        fx: fullDraft
          ? { costFxRate: data.costFxRate, saleFxRate: data.saleFxRate }
          : null,
        actorId: user.id,
        header: {
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
        },
      });
      return actionOk(null);
    });
  } catch (error) {
    return toActionError(error, "updateCvHeader");
  }
}
