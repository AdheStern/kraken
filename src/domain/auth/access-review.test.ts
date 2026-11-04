// src/domain/auth/access-review.test.ts
// Cuenta sin uso: 90 días sin iniciar sesión, contados desde el alta si nunca entró; las de baja no cuentan.
import { describe, expect, it } from "vitest";
import { isDormantAccount } from "./access-review";

const now = new Date("2026-11-04T12:00:00Z");
const daysAgo = (d: number) => new Date(now.getTime() - d * 86_400_000);

describe("isDormantAccount", () => {
  it("marca la cuenta activa con más de 90 días sin entrar", () => {
    const base = { isActive: true, createdAt: daysAgo(400) };
    expect(isDormantAccount({ ...base, lastSignInAt: daysAgo(91) }, now)).toBe(
      true,
    );
    expect(isDormantAccount({ ...base, lastSignInAt: daysAgo(90) }, now)).toBe(
      false,
    );
  });

  it("cuenta desde el alta si nunca entró", () => {
    expect(
      isDormantAccount(
        { isActive: true, createdAt: daysAgo(10), lastSignInAt: null },
        now,
      ),
    ).toBe(false);
    expect(
      isDormantAccount(
        { isActive: true, createdAt: daysAgo(120), lastSignInAt: null },
        now,
      ),
    ).toBe(true);
  });

  it("ignora las cuentas dadas de baja", () => {
    expect(
      isDormantAccount(
        { isActive: false, createdAt: daysAgo(400), lastSignInAt: null },
        now,
      ),
    ).toBe(false);
  });
});
