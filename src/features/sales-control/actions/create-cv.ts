// src/features/sales-control/actions/create-cv.ts
// Crea un CV con número correlativo de su ciudad y año, y su versión 1 en BORRADOR (AGENTS.md §2.1).
"use server";

import {
  toBusinessDate,
  toBusinessYear,
} from "@/domain/calendar/business-date";
import { toCvCode } from "@/domain/sales-control/cv-code";
import { type ActionResult, actionError, actionOk } from "@/lib/action-result";
import { toActionError } from "@/server/action-errors";
import { canCreateCv } from "@/server/authz/cv-permissions";
import { systemClock } from "@/server/clock";
import { runInTransaction } from "@/server/db";
import { allocateCvNumber } from "@/server/sales-control/allocate-cv-number";
import { getSessionUser } from "@/server/session";
import { toCustomerParty } from "../customer-snapshot";
import {
  type CreateCvInput,
  createCvSchema,
} from "../schemas/create-cv-schema";

export async function createCv(
  input: CreateCvInput,
): Promise<ActionResult<{ cvId: string }>> {
  const user = await getSessionUser();
  if (!user)
    return actionError(
      "UNAUTHENTICATED",
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  if (!canCreateCv(user))
    return actionError("FORBIDDEN", "Tu rol no permite crear CV.");
  const parsed = createCvSchema.safeParse(input);
  if (!parsed.success)
    return actionError("VALIDATION", parsed.error.issues[0].message);
  const data = parsed.data;

  try {
    const cvId = await runInTransaction(async (tx) => {
      // TRAMPA: en serie; dentro de una transacción el cliente usa una sola conexión y pg@9 rechaza consultas en paralelo.
      const city = await tx.city.findUnique({ where: { id: data.cityId } });
      const customer = await tx.customer.findUnique({
        where: { id: data.customerId },
      });
      const officialFx = await tx.fxRate.findFirst({
        orderBy: { effectiveOn: "desc" },
      });
      if (!city || !customer) return null;
      const now = systemClock.now();
      const year = toBusinessYear(now);
      const number = await allocateCvNumber(tx, city.id, year);
      const cv = await tx.cv.create({
        data: {
          number,
          year,
          code: toCvCode({ number, cityCode: city.code, year }),
          cityId: city.id,
          customerId: customer.id,
          createdById: user.id,
          isOpeningBalance: data.isOpeningBalance ?? false,
          versions: {
            create: {
              number: 1,
              title: data.title,
              issuedOn: new Date(toBusinessDate(now)),
              customerSnapshot: {
                customer: toCustomerParty(customer),
                endCustomer: null,
              },
              costFxRate: data.costFxRate,
              saleFxRate: data.saleFxRate,
              officialFxRate: officialFx?.sellRate ?? null,
              createdById: user.id,
              sellers: { create: { userId: user.id } },
            },
          },
        },
      });
      return cv.id;
    });
    if (!cvId)
      return actionError(
        "NOT_FOUND",
        "La ciudad o el cliente ya no existen. Recarga la página.",
      );
    return actionOk({ cvId });
  } catch (error) {
    return toActionError(error, "createCv");
  }
}
