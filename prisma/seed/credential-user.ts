// prisma/seed/credential-user.ts
// Alta idempotente de un usuario con contraseña (cuenta "credential" de Better Auth), su perfil y un rol.
// La usan el seed del administrador y el de usuarios de desarrollo.
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import type { RoleCode } from "@/generated/prisma/enums";
import type { Tx } from "@/server/db";

type CredentialUser = {
  email: string;
  name: string;
  password: string;
  role: RoleCode;
  areaId?: string;
};

export async function upsertCredentialUser(tx: Tx, input: CredentialUser) {
  const email = input.email.trim().toLowerCase();
  const passwordHash = await hashPassword(input.password);
  const user = await tx.user.upsert({
    where: { email },
    create: { id: randomUUID(), email, name: input.name, emailVerified: true },
    update: { emailVerified: true },
  });
  const credential = await tx.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });
  if (credential) {
    await tx.account.update({
      where: { id: credential.id },
      data: { password: passwordHash },
    });
  } else {
    await tx.account.create({
      data: {
        id: randomUUID(),
        userId: user.id,
        accountId: user.id,
        providerId: "credential",
        password: passwordHash,
      },
    });
  }
  await tx.userProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id },
    update: { isActive: true },
  });
  const role = await tx.role.findUniqueOrThrow({ where: { code: input.role } });
  const areaId = input.areaId ?? null;
  // TRAMPA: la unicidad usa NULLS NOT DISTINCT (area_id null); Prisma no puede hacer upsert sobre ella.
  const assigned = await tx.userRole.findFirst({
    where: { userId: user.id, roleId: role.id, areaId },
  });
  if (!assigned) {
    await tx.userRole.create({
      data: { userId: user.id, roleId: role.id, areaId, source: "MANUAL" },
    });
  }
  return user;
}
