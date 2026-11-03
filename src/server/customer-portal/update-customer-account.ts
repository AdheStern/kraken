// src/server/customer-portal/update-customer-account.ts
// Cambia la contraseña (cierra sus sesiones) y la configuración del portal de la cuenta de un cliente (§2.11).
import { hashPassword } from "better-auth/crypto";
import type { Tx } from "@/server/db";
import { setPortalAccess } from "./create-customer-account";

export type CustomerAccountChange = {
  userId: string;
  password: string;
  seesBags: boolean;
  requestsWork: boolean;
  comments: boolean;
};

export async function updateCustomerAccount(
  tx: Tx,
  change: CustomerAccountChange,
): Promise<{ customerId: string } | null> {
  const profile = await tx.userProfile.findFirst({
    where: {
      userId: change.userId,
      roles: { some: { role: { code: "CLIENTE" } } },
    },
    select: { customerId: true },
  });
  if (!profile?.customerId) return null;
  await setPortalAccess(tx, profile.customerId, change);
  if (change.password) {
    await tx.account.updateMany({
      where: { userId: change.userId, providerId: "credential" },
      data: { password: await hashPassword(change.password) },
    });
    // POR QUÉ: con la contraseña nueva, quien tenía la anterior deja de entrar al instante.
    await tx.session.deleteMany({ where: { userId: change.userId } });
  }
  return { customerId: profile.customerId };
}
