// src/domain/security/security-alert-rules.test.ts
// Aviso de intentos fallidos: tramo alineado al reloj y un solo aviso al cruzar el umbral.
import { describe, expect, it } from "vitest";
import {
  accountsCrossingThreshold,
  attemptsReadFrom,
  lastClosedSlice,
} from "./security-alert-rules";

const at = (hhmm: string) => new Date(`2026-11-04T${hhmm}:00Z`);
const attempts = (email: string, ...times: string[]) =>
  times.map((t) => ({ email, at: at(t) }));

describe("lastClosedSlice", () => {
  it("toma el tramo de 5 min que acaba de cerrar", () => {
    const slice = lastClosedSlice(new Date("2026-11-04T10:05:12Z"));
    expect(slice).toEqual({ from: at("10:00"), to: at("10:05") });
    expect(attemptsReadFrom(slice)).toEqual(at("09:45"));
  });
});

describe("accountsCrossingThreshold", () => {
  const slice = { from: at("10:00"), to: at("10:05") };

  it("avisa cuando el quinto intento cae en el tramo", () => {
    const rows = attempts(
      "a@x.bo",
      "09:50",
      "09:55",
      "09:58",
      "10:01",
      "10:03",
    );
    expect(accountsCrossingThreshold(rows, slice)).toEqual(["a@x.bo"]);
  });

  it("no repite el aviso si ya había cruzado antes del tramo", () => {
    const rows = attempts(
      "a@x.bo",
      "09:50",
      "09:51",
      "09:52",
      "09:53",
      "09:54",
      "10:02",
    );
    expect(accountsCrossingThreshold(rows, slice)).toEqual([]);
  });

  it("no avisa con 4 intentos ni mezcla cuentas", () => {
    const rows = [
      ...attempts("a@x.bo", "10:00", "10:01", "10:02", "10:03"),
      ...attempts("b@x.bo", "10:04"),
    ];
    expect(accountsCrossingThreshold(rows, slice)).toEqual([]);
  });

  it("vuelve a avisar cuando la ventana se vació y se cruza de nuevo", () => {
    const rows = attempts(
      "a@x.bo",
      "09:30",
      "09:31",
      "09:32",
      "09:33",
      "09:34",
      "09:56",
      "09:57",
      "09:58",
      "10:00",
      "10:04",
    );
    expect(accountsCrossingThreshold(rows, slice)).toEqual(["a@x.bo"]);
  });

  it("el borde final del tramo queda para el siguiente", () => {
    const rows = attempts(
      "a@x.bo",
      "09:51",
      "09:52",
      "09:53",
      "09:54",
      "10:05",
    );
    expect(accountsCrossingThreshold(rows, slice)).toEqual([]);
  });
});
