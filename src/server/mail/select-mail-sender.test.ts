// src/server/mail/select-mail-sender.test.ts
// Elección del transporte de correo por entorno (ADR-08, AGENTS.md §10): staging con Mailpit y producción estricta.
import { describe, expect, it } from "vitest";
import { describeMailTransport } from "./describe-mail-transport";
import { selectMailSender } from "./select-mail-sender";

const GRAPH_ENV = {
  ENTRA_TENANT_ID: "t",
  GRAPH_CLIENT_ID: "c",
  GRAPH_CLIENT_SECRET: "s",
  MAIL_SENDER: "kraken@dima.com.bo",
};
const MAILPIT_URL = "http://mailpit:8025";

describe("selectMailSender", () => {
  it("en staging con MAILPIT_URL usa Mailpit aunque Graph esté configurado", () => {
    const env = {
      ...GRAPH_ENV,
      NODE_ENV: "production",
      APP_ENV: "staging",
      MAILPIT_URL,
    };
    expect(selectMailSender(env).name).toBe("mailpit");
    expect(describeMailTransport(env)).toMatchObject({
      name: "Mailpit (staging)",
      ready: true,
    });
  });

  it("en staging sin MAILPIT_URL aplica la regla de producción", () => {
    const env = { NODE_ENV: "production", APP_ENV: "staging" };
    expect(() => selectMailSender(env)).toThrow(/GRAPH_CLIENT_ID/);
    expect(selectMailSender({ ...env, ...GRAPH_ENV }).name).toBe("graph");
  });

  it("en producción no arranca sin Graph, aunque haya MAILPIT_URL", () => {
    for (const APP_ENV of [undefined, "production", "Staging"]) {
      const env = { NODE_ENV: "production", APP_ENV, MAILPIT_URL };
      expect(() => selectMailSender(env)).toThrow(/GRAPH_CLIENT_ID/);
      expect(describeMailTransport(env).ready).toBe(false);
    }
  });

  it("en producción con Graph usa Graph", () => {
    const env = { ...GRAPH_ENV, NODE_ENV: "production", MAILPIT_URL };
    expect(selectMailSender(env).name).toBe("graph");
    expect(describeMailTransport(env).name).toBe("Microsoft Graph");
  });

  it("en desarrollo sin Graph usa Mailpit local", () => {
    expect(selectMailSender({ NODE_ENV: "development" }).name).toBe("mailpit");
  });
});
