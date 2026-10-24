// src/server/client-ip.test.ts
// IP del cliente detrás de los proxies (ADR-05, ADR-14): se salta lo confiable desde la derecha y nunca se cree
// en el primer valor, que escribe el cliente.
import { describe, expect, it } from "vitest";
import { clientIpFrom, trustedProxiesFromEnv } from "./client-ip";

const proxies = ["10.20.0.0/24", "192.0.2.10"];

describe("clientIpFrom", () => {
  it("toma el primer salto no confiable desde la derecha", () => {
    expect(clientIpFrom("203.0.113.7, 192.0.2.10, 10.20.0.5", proxies)).toBe(
      "203.0.113.7",
    );
  });

  it("ignora lo que el cliente inventa a la izquierda", () => {
    expect(
      clientIpFrom("1.1.1.1, 203.0.113.7, 192.0.2.10, 10.20.0.5", proxies),
    ).toBe("203.0.113.7");
  });

  it("sin proxies configurados vale el último salto", () => {
    expect(clientIpFrom("1.1.1.1, 203.0.113.7", [])).toBe("203.0.113.7");
  });

  it("si todo es confiable o no hay cabecera, no hay IP", () => {
    expect(clientIpFrom("10.20.0.5", proxies)).toBeNull();
    expect(clientIpFrom(null, proxies)).toBeNull();
  });

  it("los rangos se comparan por bits y los inválidos no coinciden", () => {
    expect(clientIpFrom("10.20.1.5", proxies)).toBe("10.20.1.5");
    expect(clientIpFrom("10.20.0.9", ["10.20.0.0/33"])).toBe("10.20.0.9");
    expect(clientIpFrom("10.20.0.9", ["0.0.0.0/0"])).toBeNull();
  });
});

describe("trustedProxiesFromEnv", () => {
  it("lee la lista separada por comas", () => {
    expect(trustedProxiesFromEnv(" 10.0.0.0/24 ,192.0.2.10,")).toEqual([
      "10.0.0.0/24",
      "192.0.2.10",
    ]);
    expect(trustedProxiesFromEnv(undefined)).toEqual([]);
  });
});
