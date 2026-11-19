// src/domain/tickets/parse-historical-rows.test.ts
// Carga histórica de tickets (AGENTS.md §2.6, decisión 2026-11-19): agrupación por referencia, fechas de
// apertura y cierre derivadas, tramos en hora de La Paz y errores por celda.
import { describe, expect, it } from "vitest";
import type { HistoricalRow } from "./historical-row-parts";
import { parseHistoricalDate, parseHistoricalTime } from "./historical-values";
import { parseHistoricalRows } from "./parse-historical-rows";

const NOW = new Date("2026-11-19T16:00:00Z");
const lp = (local: string) => new Date(`${local}:00-04:00`);

const row = (overrides: Partial<HistoricalRow> = {}): HistoricalRow => ({
  ref: "",
  openedOn: "02/11/2026",
  title: "Migración de correo",
  description: "",
  customerId: "c1",
  cityId: "lp",
  areaIds: ["a1"],
  projectId: "",
  priority: "MEDIA",
  ownerId: "u1",
  status: "CERRADO",
  workDate: "02/11/2026",
  from: "09:00",
  to: "11:30",
  executorId: "",
  bagId: "b1",
  closedOn: "",
  ...overrides,
});
const blank = (): HistoricalRow => ({
  ...row(),
  ...Object.fromEntries(Object.keys(row()).map((k) => [k, ""])),
  areaIds: [],
});

describe("parseHistoricalRows", () => {
  it("una fila cerrada abre con su primer tramo y se resuelve al terminar el último", () => {
    const { tickets, issues } = parseHistoricalRows([row()], NOW);
    expect(issues).toEqual([]);
    expect(tickets).toHaveLength(1);
    const [t] = tickets;
    expect(t.openedAt).toEqual(lp("2026-11-02T09:00"));
    expect(t.resolvedAt).toEqual(lp("2026-11-02T11:30"));
    expect(t.description).toBe("Migración de correo");
    expect(t.intervals).toEqual([
      {
        row: 0,
        executorId: "u1",
        start: lp("2026-11-02T09:00"),
        end: lp("2026-11-02T11:30"),
      },
    ]);
  });

  it("las filas con la misma referencia son un ticket con varios tramos y otro ejecutor", () => {
    const { tickets, issues } = parseHistoricalRows(
      [
        row({ ref: "T-1", openedOn: "01/11/2026" }),
        blank(),
        {
          ...blank(),
          ref: "t-1",
          workDate: "03/11/2026",
          from: "14:00",
          to: "15:00",
          executorId: "u2",
        },
        row({
          ref: "T-2",
          status: "EN_PROGRESO",
          bagId: "",
          workDate: "04/11/2026",
        }),
      ],
      NOW,
    );
    expect(issues).toEqual([]);
    expect(tickets.map((t) => t.rows)).toEqual([[0, 2], [3]]);
    const [first, second] = tickets;
    expect(first.openedAt).toEqual(lp("2026-11-01T08:30"));
    expect(first.resolvedAt).toEqual(lp("2026-11-03T15:00"));
    expect(first.intervals.map((i) => i.executorId)).toEqual(["u1", "u2"]);
    expect(second.resolvedAt).toBeNull();
    expect(second.bagId).toBeNull();
  });

  it("un tramo de continuación sin ejecutor es del encargado del ticket", () => {
    const { tickets } = parseHistoricalRows(
      [
        row({ ref: "T-9" }),
        {
          ...blank(),
          ref: "T-9",
          workDate: "03/11/2026",
          from: "10:00",
          to: "11:00",
        },
      ],
      NOW,
    );
    expect(tickets[0].intervals.map((i) => i.executorId)).toEqual(["u1", "u1"]);
  });

  it("una fila de continuación con otra cabecera se marca en esa celda", () => {
    const { tickets, issues } = parseHistoricalRows(
      [row({ ref: "T-1" }), { ...blank(), ref: "T-1", customerId: "c2" }],
      NOW,
    );
    expect(tickets).toEqual([]);
    expect(issues).toEqual([
      expect.objectContaining({ row: 1, column: "customerId" }),
    ]);
  });

  it("una fecha de cierre posterior al último trabajo cierra a las 18:30 de ese día", () => {
    const { tickets } = parseHistoricalRows(
      [row({ closedOn: "05/11/2026" })],
      NOW,
    );
    expect(tickets[0].resolvedAt).toEqual(lp("2026-11-05T18:30"));
  });

  it("un ticket sin trabajo abre y se resuelve a las 08:30 de su apertura", () => {
    const { tickets } = parseHistoricalRows(
      [row({ workDate: "", from: "", to: "", status: "RESUELTO" })],
      NOW,
    );
    expect(tickets[0].openedAt).toEqual(lp("2026-11-02T08:30"));
    expect(tickets[0].resolvedAt).toEqual(lp("2026-11-02T08:30"));
    expect(tickets[0].intervals).toEqual([]);
  });

  it.each([
    [{ openedOn: "31/02/2026" }, "openedOn"],
    [{ openedOn: "05/11/2026" }, "openedOn"],
    [{ title: "ab" }, "title"],
    [{ ownerId: "" }, "ownerId"],
    [{ areaIds: [] }, "areaIds"],
    [{ priority: "URGENTE" }, "priority"],
    [{ status: "CANCELADO" }, "status"],
    [{ status: "ASIGNADO" }, "status"],
    [{ status: "EN_PROGRESO", closedOn: "03/11/2026" }, "closedOn"],
    [{ closedOn: "01/11/2026" }, "closedOn"],
    [{ closedOn: "20/11/2026" }, "closedOn"],
    [{ from: "9" }, "from"],
    [{ to: "08:00" }, "to"],
    [{ from: "00:00", to: "17:00" }, "to"],
    [{ workDate: "19/11/2026", from: "11:00", to: "13:00" }, "to"],
    [{ workDate: "" }, "workDate"],
  ] as const)("marca el error de %o en %s", (overrides, column) => {
    const { tickets, issues } = parseHistoricalRows(
      [row(overrides as Partial<HistoricalRow>)],
      NOW,
    );
    expect(tickets).toEqual([]);
    expect(issues.map((i) => i.column)).toContain(column);
  });

  it("dos tramos solapados de la misma persona se marcan en el posterior", () => {
    const { issues } = parseHistoricalRows(
      [row({ ref: "A" }), row({ ref: "B", from: "11:00", to: "12:00" })],
      NOW,
    );
    expect(issues).toEqual([
      expect.objectContaining({ row: 1, column: "from" }),
    ]);
  });

  it("sin filas con datos no hay tickets ni errores", () => {
    expect(parseHistoricalRows([blank(), blank()], NOW)).toEqual({
      tickets: [],
      issues: [],
    });
  });
});

describe("parseHistoricalDate y parseHistoricalTime", () => {
  it("aceptan los formatos de Excel y rechazan lo que no existe", () => {
    expect(parseHistoricalDate("2/11/26")).toBe("2026-11-02");
    expect(parseHistoricalDate("2026-11-02")).toBe("2026-11-02");
    expect(parseHistoricalDate("02.11.2026")).toBe("2026-11-02");
    expect(parseHistoricalDate("30/02/2026")).toBeNull();
    expect(parseHistoricalDate("noviembre")).toBeNull();
    expect(parseHistoricalTime("9:05")).toBe("09:05");
    expect(parseHistoricalTime("18:30:00")).toBe("18:30");
    expect(parseHistoricalTime("24:00")).toBeNull();
    expect(parseHistoricalTime("9")).toBeNull();
  });
});
