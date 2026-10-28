// tests/integration/ticket-timer.int.test.ts
// Contador por eventos, registros manuales y contadores olvidados contra la base (AGENTS.md §2.6, §8, §7
// timers.stale): un solo contador corriendo por persona (iniciar otro pausa el anterior), contadores visibles
// por ticket, sin solapes, tardíos y aviso único.
import { afterAll, describe, expect, it, vi } from "vitest";
import { listOpenTimers } from "@/features/tickets/queries/list-open-timers";
import type { SessionUser } from "@/server/authz/roles";
import type { Tx } from "@/server/db";
import { addManualTimeEntryRecord } from "@/server/tickets/add-manual-time-entry-record";
import { changeTimerRecord } from "@/server/tickets/change-timer-record";
import { deleteTimeEntryRecord } from "@/server/tickets/delete-time-entry-record";
import { hasActiveTimers } from "@/server/tickets/has-active-timers";
import { startTimerRecord } from "@/server/tickets/start-timer-record";
import { warnProjectedOverrun } from "@/server/tickets/warn-projected-overrun";
import { warnStaleTimers } from "@/server/tickets/warn-stale-timers";
import { createTestPrisma, createUserWithRoles } from "./test-db";
import { createTicket, createTicketFixture, lp } from "./ticket-fixtures";

vi.mock("@/server/db", async () => {
  const { createTestPrisma: create } = await import("./test-db");
  return { prisma: create() };
});

const db = createTestPrisma();
afterAll(() => db.$disconnect());

const run = <T>(work: (tx: Tx) => Promise<T>) => db.$transaction(work);
const code = (r: { ok: boolean; error?: { code: string } }) =>
  r.ok ? "OK" : r.error?.code;

async function assignedTicket() {
  const f = await createTicketFixture(db, []);
  const engineer = await createUserWithRoles(db, "Ingeniera", [
    { code: "INGENIERO", areaId: f.area.id },
  ]);
  await db.ticket.update({
    where: { id: f.ticket.id },
    data: { ownerId: engineer.id, status: "ASIGNADO" },
  });
  return { ...f, engineer };
}

describe("contador", () => {
  it("inicia, pausa, reanuda y termina; iniciar o reanudar otro pausa el que corría", async () => {
    const f = await assignedTicket();
    const other = await createTicket(db, f, [], "EN_PROGRESO");
    await db.ticket.update({
      where: { id: other.id },
      data: { ownerId: f.engineer.id },
    });
    const start = (ticketId: string) =>
      run((tx) =>
        startTimerRecord(tx, f.engineer, { ticketId, subtaskId: null }),
      );
    const change = (
      timerId: string,
      kind: "PAUSAR" | "REANUDAR" | "TERMINAR",
    ) => run((tx) => changeTimerRecord(tx, f.engineer, { timerId, kind }));

    const started = await start(f.ticket.id);
    if (!started.ok) throw new Error(started.error.message);
    const { timerId } = started.data;
    expect(
      (await db.ticket.findUniqueOrThrow({ where: { id: f.ticket.id } }))
        .status,
    ).toBe("EN_PROGRESO");
    const second = await start(other.id);
    if (!second.ok) throw new Error(second.error.message);
    const openSpans = () =>
      db.timeEntry.count({ where: { userId: f.engineer.id, endedAt: null } });
    expect(await openSpans()).toBe(1);
    expect(code(await change(timerId, "PAUSAR"))).toBe("INVALID_STATE");
    expect(code(await change(timerId, "REANUDAR"))).toBe("OK");
    expect(await openSpans()).toBe(1);
    expect(code(await change(second.data.timerId, "TERMINAR"))).toBe("OK");

    expect(await change(timerId, "PAUSAR")).toEqual({
      ok: true,
      data: { status: "PAUSADO" },
    });
    expect(code(await change(timerId, "REANUDAR"))).toBe("OK");
    expect(code(await change(timerId, "TERMINAR"))).toBe("OK");

    const entries = await db.timeEntry.findMany({ where: { timerId } });
    expect(entries).toHaveLength(3);
    expect(
      entries.every((e) => e.endedAt !== null && e.source === "CONTADOR"),
    ).toBe(true);
    expect(await run((tx) => hasActiveTimers(tx, f.ticket.id))).toBe(false);
  });

  it("en una subtarea, iniciar la pasa a EN_PROGRESO y terminar a COMPLETADA", async () => {
    const f = await assignedTicket();
    const subtask = await db.subtask.create({
      data: {
        ticketId: f.ticket.id,
        title: "Revisar el rack",
        assigneeId: f.engineer.id,
        createdById: f.engineer.id,
      },
    });
    const status = async () =>
      (await db.subtask.findUniqueOrThrow({ where: { id: subtask.id } }))
        .status;
    const started = await run((tx) =>
      startTimerRecord(tx, f.engineer, {
        ticketId: f.ticket.id,
        subtaskId: subtask.id,
      }),
    );
    if (!started.ok) throw new Error(started.error.message);
    expect(await status()).toBe("EN_PROGRESO");
    await run((tx) =>
      changeTimerRecord(tx, f.engineer, {
        timerId: started.data.timerId,
        kind: "TERMINAR",
      }),
    );
    expect(await status()).toBe("COMPLETADA");
  });

  it("los contadores abiertos de un ticket se listan con quién los lleva", async () => {
    const f = await assignedTicket();
    const started = await run((tx) =>
      startTimerRecord(tx, f.engineer, {
        ticketId: f.ticket.id,
        subtaskId: null,
      }),
    );
    if (!started.ok) throw new Error(started.error.message);
    const timers = await listOpenTimers({ ticketId: f.ticket.id });
    expect(timers.map((t) => [t.person.id, t.status])).toEqual([
      [f.engineer.id, "CORRIENDO"],
    ]);
  });

  it("el comercial no registra tiempo y nadie toca el contador de otro", async () => {
    const f = await assignedTicket();
    const commercial = await createUserWithRoles(db, "Comercial", [
      { code: "COMERCIAL" },
    ]);
    const denied = await run((tx) =>
      startTimerRecord(tx, commercial, {
        ticketId: f.ticket.id,
        subtaskId: null,
      }),
    );
    expect(code(denied)).toBe("FORBIDDEN");
    const started = await run((tx) =>
      startTimerRecord(tx, f.engineer, {
        ticketId: f.ticket.id,
        subtaskId: null,
      }),
    );
    if (!started.ok) throw new Error(started.error.message);
    const stolen = await run((tx) =>
      changeTimerRecord(tx, f.coordinator as SessionUser, {
        timerId: started.data.timerId,
        kind: "TERMINAR",
      }),
    );
    expect(code(stolen)).toBe("NOT_FOUND");
  });
});

describe("registros manuales", () => {
  it("rechaza solapes, marca tardíos y solo borra los manuales propios", async () => {
    const f = await assignedTicket();
    const add = (start: string, end: string, now: Date) =>
      run((tx) =>
        addManualTimeEntryRecord(
          tx,
          f.engineer,
          {
            ticketId: f.ticket.id,
            subtaskId: null,
            startedAt: lp(start),
            endedAt: lp(end),
          },
          now,
        ),
      );
    const now = lp("2026-10-19T12:00");
    const onTime = await add("2026-10-19T09:00", "2026-10-19T10:00", now);
    expect(onTime).toMatchObject({ ok: true, data: { isLate: false } });
    // REGLA: el registro manual es alternativo al contador: también pasa el ticket a EN_PROGRESO (§2.6).
    expect(
      (await db.ticket.findUniqueOrThrow({ where: { id: f.ticket.id } }))
        .status,
    ).toBe("EN_PROGRESO");
    expect(code(await add("2026-10-19T09:30", "2026-10-19T11:00", now))).toBe(
      "VALIDATION",
    );
    expect(code(await add("2026-10-19T11:00", "2026-10-19T13:00", now))).toBe(
      "VALIDATION",
    );
    expect(
      await add("2026-10-15T09:00", "2026-10-15T10:00", now),
    ).toMatchObject({
      ok: true,
      data: { isLate: true },
    });

    if (!onTime.ok) throw new Error(onTime.error.message);
    const removed = await run((tx) =>
      deleteTimeEntryRecord(tx, f.engineer, { entryId: onTime.data.entryId }),
    );
    expect(code(removed)).toBe("OK");
  });
});

describe("contadores olvidados", () => {
  it("avisa una sola vez al ingeniero y al encargado pasadas 10 h", async () => {
    const f = await assignedTicket();
    const helper = await createUserWithRoles(db, "Ayudante", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    await db.timeEntry.create({
      data: {
        ticketId: f.ticket.id,
        userId: helper.id,
        startedAt: lp("2026-10-19T07:00"),
        source: "CONTADOR",
      },
    });
    const clock = { now: () => lp("2026-10-19T17:30") };
    expect((await warnStaleTimers(db, clock)).warned).toBeGreaterThanOrEqual(1);
    expect(await warnStaleTimers(db, clock)).toEqual({ warned: 0 });
    for (const userId of [helper.id, f.engineer.id])
      expect(
        await db.inboxItem.count({
          where: { userId, eventType: "CONTADOR_OLVIDADO" },
        }),
      ).toBe(1);
  });
});

describe("consumo proyectado mayor al saldo", () => {
  it("avisa una sola vez por ticket y bolsa", async () => {
    const f = await createTicketFixture(db, [
      { modality: "H24X7", minutes: 60 },
    ]);
    await db.ticket.update({
      where: { id: f.ticket.id },
      data: { status: "EN_PROGRESO" },
    });
    const engineer = await createUserWithRoles(db, "Ingeniera", [
      { code: "INGENIERO", areaId: f.area.id },
    ]);
    await db.timeEntry.create({
      data: {
        ticketId: f.ticket.id,
        userId: engineer.id,
        startedAt: lp("2026-10-19T09:00"),
        endedAt: lp("2026-10-19T11:00"),
        source: "MANUAL",
      },
    });
    const clock = { now: () => lp("2026-10-19T12:00") };
    expect(
      (await warnProjectedOverrun(db, clock)).warned,
    ).toBeGreaterThanOrEqual(1);
    expect(
      await db.inboxItem.count({
        where: {
          userId: f.userId,
          eventType: "BOLSA_PROYECCION",
          link: `/tickets/${f.ticket.id}`,
        },
      }),
    ).toBe(1);
    await warnProjectedOverrun(db, clock);
    expect(
      await db.inboxItem.count({
        where: {
          userId: f.userId,
          eventType: "BOLSA_PROYECCION",
          link: `/tickets/${f.ticket.id}`,
        },
      }),
    ).toBe(1);
  });
});
