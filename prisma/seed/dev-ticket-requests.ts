// prisma/seed/dev-ticket-requests.ts
// SOLO desarrollo: dos solicitudes de ticket pendientes para DIMAHELP y DIMANET, creadas con la misma función del
// servidor que usa la app (con su aviso a quienes las atienden; AGENTS.md §2.6).
import type { Tx } from "@/server/db";
import { createTicketRequestRecord } from "@/server/tickets/create-ticket-request-record";

const REQUESTS = [
  {
    email: "comercial@dima.local",
    areaCode: "DIMAHELP",
    title: "No puedo entrar a la VPN desde casa",
    description:
      "Desde ayer el cliente de VPN dice que mis credenciales son inválidas. En la oficina entro sin problema.",
  },
  {
    email: "administracion@dima.local",
    areaCode: "DIMANET",
    title: "La impresora del segundo piso no aparece en la red",
    description:
      "Desde el lunes nadie del segundo piso puede imprimir; la impresora enciende pero no aparece al buscarla.",
  },
];

export async function seedDevTicketRequests(
  tx: Tx,
  now: Date,
): Promise<number> {
  if ((await tx.ticketRequest.count()) > 0) return 0;
  for (const { email, areaCode, ...request } of REQUESTS) {
    const area = await tx.area.findUniqueOrThrow({ where: { code: areaCode } });
    const result = await createTicketRequestRecord(
      tx,
      await requester(tx, email),
      { ...request, areaId: area.id },
      now,
    );
    if (!result.ok) throw new Error(result.error.message);
  }
  return REQUESTS.length;
}

async function requester(tx: Tx, email: string) {
  const user = await tx.user.findUniqueOrThrow({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      profile: {
        select: {
          roles: { select: { areaId: true, role: { select: { code: true } } } },
        },
      },
    },
  });
  const roles =
    user.profile?.roles.map((r) => ({ code: r.role.code, areaId: r.areaId })) ??
    [];
  return { ...user, roles };
}
