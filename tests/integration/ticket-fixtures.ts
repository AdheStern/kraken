// tests/integration/ticket-fixtures.ts
// Datos de prueba de tickets: cliente con bolsas cargadas, ciudad con horario 08:30–18:30 de lunes a viernes,
// ticket con su jerarquía de bolsas, registros de tiempo y contadores.
import { randomUUID } from "node:crypto";
import { fromZonedTime } from "date-fns-tz";
import type { PrismaClient } from "@/generated/prisma/client";
import type {
  BagModality,
  TicketStatus,
  TimerEventKind,
} from "@/generated/prisma/enums";
import { postHourMovement } from "@/server/hours/post-hour-movement";
import { createCvFixture, createUserWithRoles } from "./test-db";

export const lp = (local: string) => fromZonedTime(local, "America/La_Paz");

// POR QUÉ: contract crea un contrato por vigencia; sin tope (uncapped) no lleva APERTURA (AGENTS.md §2.4).
type BagSpec = {
  modality: BagModality;
  minutes: number;
  expiresOn?: string;
  contract?: { startsOn: string; uncapped: boolean };
};
type CvFixture = Awaited<ReturnType<typeof createCvFixture>>;

export async function createTicketFixture(
  db: PrismaClient,
  specs: readonly BagSpec[],
) {
  const f = await createCvFixture(db);
  const schedule = await db.officeSchedule.create({
    data: {
      name: `Oficina ${randomUUID().slice(0, 8)}`,
      slots: {
        create: [1, 2, 3, 4, 5].map((weekday) => ({
          weekday,
          startMinute: 510,
          endMinute: 1110,
        })),
      },
    },
  });
  await db.city.update({
    where: { id: f.city.id },
    data: { officeScheduleId: schedule.id },
  });
  await db.cvVersionSeller.create({
    data: { versionId: f.version.id, userId: f.userId },
  });
  const bags = [];
  for (const [index, spec] of specs.entries())
    bags.push(await createLoadedBag(db, f, index + 1, spec));
  const ticket = await createTicket(
    db,
    f,
    bags.map((b) => b.id),
  );
  const coordinator = await createUserWithRoles(db, "Coordinadora", [
    { code: "COORDINADOR_SOPORTE", areaId: f.area.id },
  ]);
  return { ...f, bags, ticket, coordinator };
}

export async function createTicket(
  db: PrismaClient,
  f: CvFixture,
  bagIds: readonly string[],
  status: TicketStatus = "RESUELTO",
) {
  return db.ticket.create({
    data: {
      kind: "SOPORTE",
      customerId: f.customer.id,
      cityId: f.city.id,
      priority: "MEDIA",
      slaModality: "H8X5",
      title: "Ticket de prueba",
      description: "Prueba",
      status,
      createdById: f.userId,
      areas: { create: { areaId: f.area.id } },
      bags: {
        create: bagIds.map((bagId, i) => ({ bagId, priority: i + 1 })),
      },
    },
  });
}

// POR QUÉ: cada registro va con un ingeniero propio; la exclusión de la base impide solapes de una persona.
export async function addTimeEntry(
  db: PrismaClient,
  ticketId: string,
  start: string,
  end: string | null,
) {
  const engineer = await createUserWithRoles(db, "Ingeniero", [
    { code: "INGENIERO" },
  ]);
  return db.timeEntry.create({
    data: {
      ticketId,
      userId: engineer.id,
      startedAt: lp(start),
      endedAt: end ? lp(end) : null,
      source: "MANUAL",
    },
  });
}

export async function addTimerEvents(
  db: PrismaClient,
  ticketId: string,
  kinds: readonly TimerEventKind[],
) {
  const engineer = await createUserWithRoles(db, "Ingeniero", [
    { code: "INGENIERO" },
  ]);
  const timerId = randomUUID();
  for (const [i, kind] of kinds.entries())
    await db.timerEvent.create({
      data: {
        timerId,
        ticketId,
        userId: engineer.id,
        kind,
        occurredAt: new Date(Date.UTC(2026, 9, 19, 14, i)),
      },
    });
}

export async function ledgerOf(db: PrismaClient, bagId: string) {
  const bag = await db.hourBag.findUniqueOrThrow({ where: { id: bagId } });
  const ledger = await db.hourMovement.aggregate({
    where: { bagId },
    _sum: { minutes: true },
  });
  return {
    balance: bag.balanceMinutes,
    status: bag.status,
    ledger: ledger._sum.minutes,
  };
}

async function createLoadedBag(
  db: PrismaClient,
  f: CvFixture,
  position: number,
  spec: BagSpec,
) {
  const line = await db.cvLine.create({
    data: {
      versionId: f.version.id,
      position,
      kind: "ITEM",
      areaId: f.area.id,
      description: `Soporte ${spec.modality}`,
      quantity: String(spec.minutes / 60),
      unitCostUsd: "0",
      unitSaleUsd: "0",
      pricingSource: "PRECIO",
    },
  });
  const bag = await db.hourBag.create({
    data: {
      cvLineId: line.id,
      customerId: f.customer.id,
      modality: spec.modality,
      scope: "AREA",
      balanceMinutes: 0,
      kind: spec.contract ? "VIGENCIA" : "HORAS",
      isUncapped: spec.contract?.uncapped ?? false,
      startsOn: spec.contract
        ? new Date(`${spec.contract.startsOn}T00:00:00Z`)
        : null,
      expiresOn: spec.expiresOn
        ? new Date(`${spec.expiresOn}T00:00:00Z`)
        : null,
      areas: { create: { areaId: f.area.id } },
    },
  });
  if (spec.minutes > 0)
    await db.$transaction((tx) =>
      postHourMovement(tx, {
        bagId: bag.id,
        kind: "APERTURA",
        minutes: spec.minutes,
        actorId: f.userId,
      }),
    );
  return bag;
}
