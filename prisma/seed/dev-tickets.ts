// prisma/seed/dev-tickets.ts
// SOLO desarrollo: un CV de saldo inicial con dos bolsas (8x5 y 24x7) y tres tickets en distintos estados, creados
// con las mismas funciones del servidor que usa la app (bolsas al aprobar, alta, estados, registros, SLA).
import { fromZonedTime } from "date-fns-tz";
import {
  toBusinessDate,
  toBusinessYear,
} from "@/domain/calendar/business-date";
import { toCvCode } from "@/domain/sales-control/cv-code";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { applyVersionBags } from "@/server/hours/apply-version-bags";
import { allocateCvNumber } from "@/server/sales-control/allocate-cv-number";
import { addManualTimeEntryRecord } from "@/server/tickets/add-manual-time-entry-record";
import { addTicketComment } from "@/server/tickets/add-ticket-comment";
import { changeTicketStatusRecord } from "@/server/tickets/change-ticket-status-record";
import { createSubtaskRecord } from "@/server/tickets/create-subtask-record";
import { createTicketRecord } from "@/server/tickets/create-ticket-record";
import { setTicketBagsRecord } from "@/server/tickets/set-ticket-bags";

const CUSTOMER = "Banco Andino S.A. (demo)";
const DAY_MS = 86_400_000;

export async function seedDevTickets(tx: Tx, now: Date): Promise<number> {
  const customer = await tx.customer.findFirstOrThrow({
    where: { name: CUSTOMER },
  });
  if ((await tx.ticket.count({ where: { customerId: customer.id } })) > 0)
    return 0;
  // TRAMPA: en serie; el cliente de una transacción no admite consultas paralelas.
  const help = await tx.area.findUniqueOrThrow({ where: { code: "DIMAHELP" } });
  const net = await tx.area.findUniqueOrThrow({ where: { code: "DIMANET" } });
  const city = await tx.city.findUniqueOrThrow({ where: { code: "LP" } });
  const [coordinator, engineer, engineer2, commercial] = [
    await sessionUser(tx, "coordinador@dima.local"),
    await sessionUser(tx, "ingeniero@dima.local"),
    await sessionUser(tx, "ingeniero2@dima.local"),
    await sessionUser(tx, "comercial@dima.local"),
  ];
  const bagIds = await seedOpeningBalance(tx, {
    customerId: customer.id,
    city,
    areas: [help.id, net.id],
    commercial,
    now,
  });
  // La Paz: "hace n días a las hh:mm".
  const day = (daysAgo: number, time: string) =>
    fromZonedTime(
      `${toBusinessDate(new Date(now.getTime() - daysAgo * DAY_MS))}T${time}`,
      "America/La_Paz",
    );
  const base = {
    customerId: customer.id,
    cityId: city.id,
    projectId: null,
    bagId: null,
    kind: "SOPORTE" as const,
  };

  await ok(
    createTicketRecord(
      tx,
      coordinator,
      {
        ...base,
        areaIds: [help.id],
        priority: "BAJA",
        slaModality: "H8X5",
        title: "Impresora de recepción no imprime",
        description: "La impresora del primer piso muestra error de papel.",
        ownerId: null,
      },
      day(0, "08:40"),
    ),
  );

  const slow = await ok(
    createTicketRecord(
      tx,
      coordinator,
      {
        ...base,
        areaIds: [help.id, net.id],
        priority: "ALTA",
        slaModality: "H8X5",
        title: "Lentitud en la red de la agencia central",
        description: "Los cajeros reportan demoras al consultar saldos.",
        ownerId: engineer.id,
      },
      day(2, "09:00"),
    ),
  );
  await ok(
    changeTicketStatusRecord(
      tx,
      engineer,
      { ticketId: slow.ticketId, to: "EN_PROGRESO" },
      day(2, "09:25"),
    ),
  );
  await ok(
    setTicketBagsRecord(tx, engineer, { ticketId: slow.ticketId, bagIds }),
  );
  await ok(
    createSubtaskRecord(tx, engineer, {
      ticketId: slow.ticketId,
      title: "Revisar el switch de distribución",
      assigneeId: engineer2.id,
    }),
  );
  await ok(
    addTicketComment(
      tx,
      engineer,
      {
        ticketId: slow.ticketId,
        body: "Revisamos los enlaces; el problema está en el switch del piso 2.",
        isPublic: true,
      },
      day(2, "10:00"),
    ),
  );
  await ok(
    addManualTimeEntryRecord(
      tx,
      engineer,
      {
        ticketId: slow.ticketId,
        subtaskId: null,
        startedAt: day(1, "09:00"),
        endedAt: day(1, "11:30"),
      },
      now,
    ),
  );
  const subtask = await tx.subtask.findFirstOrThrow({
    where: { ticketId: slow.ticketId },
  });
  await ok(
    addManualTimeEntryRecord(
      tx,
      engineer2,
      {
        ticketId: slow.ticketId,
        subtaskId: subtask.id,
        startedAt: day(1, "19:00"),
        endedAt: day(1, "20:00"),
      },
      now,
    ),
  );

  const vpn = await ok(
    createTicketRecord(
      tx,
      coordinator,
      {
        ...base,
        areaIds: [help.id],
        priority: "MEDIA",
        slaModality: "H8X5",
        title: "Configurar VPN para la sucursal Sopocachi",
        description: "Acceso remoto para dos usuarios nuevos.",
        ownerId: engineer.id,
      },
      day(3, "10:00"),
    ),
  );
  await ok(
    changeTicketStatusRecord(
      tx,
      engineer,
      { ticketId: vpn.ticketId, to: "EN_PROGRESO" },
      day(3, "10:30"),
    ),
  );
  await ok(
    setTicketBagsRecord(tx, engineer, {
      ticketId: vpn.ticketId,
      bagIds: [bagIds[0]],
    }),
  );
  await ok(
    addManualTimeEntryRecord(
      tx,
      engineer,
      {
        ticketId: vpn.ticketId,
        subtaskId: null,
        startedAt: day(3, "14:00"),
        endedAt: day(3, "16:00"),
      },
      now,
    ),
  );
  await ok(
    changeTicketStatusRecord(
      tx,
      engineer,
      { ticketId: vpn.ticketId, to: "RESUELTO" },
      day(3, "16:10"),
    ),
  );
  return 3;
}

type OpeningBalance = {
  customerId: string;
  city: { id: string; code: string };
  areas: [string, string];
  commercial: SessionUser;
  now: Date;
};

// POR QUÉ: un CV de saldo inicial aprobado es el camino real de las bolsas vigentes (§14 F2); applyVersionBags
// las abre con su APERTURA como en una aprobación.
async function seedOpeningBalance(
  tx: Tx,
  { customerId, city, areas, commercial, now }: OpeningBalance,
) {
  const year = toBusinessYear(now);
  const number = await allocateCvNumber(tx, city.id, year);
  const code = toCvCode({ number, cityCode: city.code, year });
  const cv = await tx.cv.create({
    data: {
      number,
      cityId: city.id,
      year,
      code,
      customerId,
      createdById: commercial.id,
      isOpeningBalance: true,
    },
  });
  const hours = await tx.unit.findFirstOrThrow({ where: { isHours: true } });
  const version = await tx.cvVersion.create({
    data: {
      cvId: cv.id,
      number: 1,
      title: "Saldo inicial de horas (demo)",
      issuedOn: now,
      customerSnapshot: {},
      costFxRate: "6.96",
      saleFxRate: "6.96",
      createdById: commercial.id,
    },
  });
  const specs = [
    {
      areaId: areas[0],
      quantity: "20",
      modality: "H8X5",
      description: "Soporte 8x5 (saldo inicial)",
    },
    {
      areaId: areas[1],
      quantity: "10",
      modality: "H24X7",
      description: "Soporte 24x7 (saldo inicial)",
    },
  ];
  for (const [index, spec] of specs.entries())
    await tx.cvLine.create({
      data: {
        versionId: version.id,
        position: index + 1,
        kind: "ITEM",
        areaId: spec.areaId,
        itemType: "SERVICIO",
        unitId: hours.id,
        description: spec.description,
        quantity: spec.quantity,
        unitCostUsd: "0",
        unitSaleUsd: "0",
        pricingSource: "PRECIO",
        hourBagSpec: {
          modality: spec.modality,
          scope: "AREA",
          areaIds: [spec.areaId],
          projectId: null,
          expiresOn: "",
        },
      },
    });
  await tx.cvVersion.update({
    where: { id: version.id },
    data: { status: "APROBADA", submittedAt: now, approvedAt: now },
  });
  await applyVersionBags(tx, {
    cvId: cv.id,
    versionId: version.id,
    actorId: commercial.id,
    label: code,
    reason: null,
  });
  const bags = await tx.hourBag.findMany({
    where: { cvLine: { versionId: version.id } },
    orderBy: { cvLine: { position: "asc" } },
  });
  return bags.map((b) => b.id);
}

async function sessionUser(tx: Tx, email: string): Promise<SessionUser> {
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
  return {
    ...user,
    roles:
      user.profile?.roles.map((r) => ({
        code: r.role.code,
        areaId: r.areaId,
      })) ?? [],
  };
}

async function ok<T>(
  result: Promise<
    { ok: true; data: T } | { ok: false; error: { message: string } }
  >,
): Promise<T> {
  const settled = await result;
  if (!settled.ok) throw new Error(`Seed de tickets: ${settled.error.message}`);
  return settled.data;
}
