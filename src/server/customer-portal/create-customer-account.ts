// src/server/customer-portal/create-customer-account.ts
// Alta de la cuenta de una empresa cliente (AGENTS.md §2.11): usuario de Better Auth con contraseña, perfil
// ligado al cliente, rol CLIENTE y la configuración del portal en el cliente, en la transacción de la action.
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { Tx } from "@/server/db";

export type NewCustomerAccount = {
  customerId: string;
  name: string;
  email: string;
  password: string;
  seesBags: boolean;
  requestsWork: boolean;
  comments: boolean;
};

export async function createCustomerAccount(
  tx: Tx,
  input: NewCustomerAccount,
): Promise<{ userId: string } | { conflict: string }> {
  const customer = await tx.customer.findFirst({
    where: { id: input.customerId, isActive: true },
    select: { id: true },
  });
  if (!customer) return { conflict: "El cliente no existe o está de baja." };
  const taken = await tx.user.count({ where: { email: input.email } });
  if (taken > 0) return { conflict: "Ya hay una cuenta con ese correo." };

  const userId = randomUUID();
  await tx.user.create({
    data: {
      id: userId,
      email: input.email,
      name: input.name,
      emailVerified: true,
    },
  });
  await tx.account.create({
    data: {
      id: randomUUID(),
      userId,
      accountId: userId,
      providerId: "credential",
      password: await hashPassword(input.password),
    },
  });
  await tx.userProfile.create({
    data: { userId, customerId: customer.id },
  });
  const role = await tx.role.findUniqueOrThrow({ where: { code: "CLIENTE" } });
  await tx.userRole.create({
    data: { userId, roleId: role.id, source: "MANUAL" },
  });
  await setPortalAccess(tx, customer.id, input);
  return { userId };
}

export async function setPortalAccess(
  tx: Tx,
  customerId: string,
  access: Pick<NewCustomerAccount, "seesBags" | "requestsWork" | "comments">,
): Promise<void> {
  await tx.customer.update({
    where: { id: customerId },
    data: {
      portalSeesBags: access.seesBags,
      portalRequests: access.requestsWork,
      portalComments: access.comments,
    },
  });
}
