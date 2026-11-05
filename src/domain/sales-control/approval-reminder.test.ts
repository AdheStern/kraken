// src/domain/sales-control/approval-reminder.test.ts
// Recordatorio de aprobaciones (AGENTS.md §7 approvals.reminder): tras 24 h, una vez por día de La Paz.
import { describe, expect, it } from "vitest";
import { isReminderDue, waitingDays } from "./approval-reminder";

// Lunes 09:00 en La Paz.
const NOW = new Date("2026-11-09T13:00:00Z");

describe("isReminderDue", () => {
  it("no recuerda antes de las 24 h de espera", () => {
    expect(isReminderDue(new Date("2026-11-08T14:00:00Z"), null, NOW)).toBe(
      false,
    );
    expect(isReminderDue(new Date("2026-11-08T13:00:00Z"), null, NOW)).toBe(
      true,
    );
  });

  it("recuerda una vez por día de negocio, aunque el job reintente", () => {
    const created = new Date("2026-11-05T13:00:00Z");
    expect(isReminderDue(created, new Date("2026-11-09T13:00:01Z"), NOW)).toBe(
      false,
    );
    // Viernes a las 23:30 en La Paz es otro día de negocio, aunque en UTC ya sea sábado.
    expect(isReminderDue(created, new Date("2026-11-07T03:30:00Z"), NOW)).toBe(
      true,
    );
  });
});

describe("waitingDays", () => {
  it("cuenta días completos", () => {
    expect(waitingDays(new Date("2026-11-06T14:00:00Z"), NOW)).toBe(2);
  });
});
