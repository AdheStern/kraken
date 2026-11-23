// src/domain/customers/phone-format.test.ts
// Formato de teléfonos con código de país: bloques por país, lectura de lo ya guardado y posición del cursor.
import { describe, expect, it } from "vitest";
import { PHONE_COUNTRIES } from "./phone-countries";
import {
  caretAfterDigits,
  formatNationalPhone,
  parsePhone,
  toStoredPhone,
} from "./phone-format";

describe("formatNationalPhone", () => {
  it("separa celular y fijo de Bolivia", () => {
    expect(formatNationalPhone("BO", "71234567")).toBe("7123 4567");
    expect(formatNationalPhone("BO", "22123456")).toBe("2 212 3456");
  });

  it("aplica el patrón mientras se escribe, sin que los bloques salten", () => {
    expect(formatNationalPhone("BO", "71234")).toBe("7123 4");
    expect(formatNationalPhone("BO", "2212")).toBe("2 212");
    expect(formatNationalPhone("PE", "98765")).toBe("987 65");
  });

  it("usa el patrón de cada país", () => {
    expect(formatNationalPhone("AR", "1112345678")).toBe("11 1234 5678");
    expect(formatNationalPhone("CL", "912345678")).toBe("9 1234 5678");
    expect(formatNationalPhone("US", "2015550123")).toBe("201 555 0123");
  });

  it("un largo sin patrón deja los últimos 4 juntos", () => {
    expect(formatNationalPhone("BO", "1234567890")).toBe("123 456 7890");
    expect(formatNationalPhone("PE", "12345678901")).toBe("1 234 567 8901");
  });
});

describe("parsePhone", () => {
  it("reconoce el código de país de lo guardado", () => {
    expect(parsePhone("+591 7123 4567")).toEqual({
      country: "BO",
      national: "71234567",
    });
    expect(parsePhone("+54 11 1234 5678")).toEqual({
      country: "AR",
      national: "1112345678",
    });
    expect(parsePhone("+595 981 123 456").country).toBe("PY");
  });

  it("asume Bolivia en los teléfonos cargados sin código", () => {
    expect(parsePhone("7123-4567")).toEqual({
      country: "BO",
      national: "71234567",
    });
    expect(parsePhone("591 71234567").national).toBe("71234567");
    expect(parsePhone(null)).toEqual({ country: "BO", national: "" });
  });

  it("deja tal cual lo que no es un solo número", () => {
    expect(parsePhone("71234567 / 2212345")).toEqual({
      country: "OTRO",
      national: "71234567 / 2212345",
    });
    expect(parsePhone("2212345 int. 23").country).toBe("OTRO");
    expect(parsePhone("+999 123").country).toBe("OTRO");
  });
});

describe("toStoredPhone", () => {
  it("guarda con el código y los bloques", () => {
    expect(toStoredPhone({ country: "BO", national: "71234567" })).toBe(
      "+591 7123 4567",
    );
    expect(toStoredPhone({ country: "PE", national: "987 654 321" })).toBe(
      "+51 987 654 321",
    );
  });

  it("sin número no guarda el código solo", () => {
    expect(toStoredPhone({ country: "BO", national: "" })).toBe("");
  });

  it("en OTRO guarda el texto escrito", () => {
    expect(toStoredPhone({ country: "OTRO", national: " 7123 / 2212 " })).toBe(
      "7123 / 2212",
    );
  });

  it("recorta a 15 dígitos con el código", () => {
    expect(toStoredPhone({ country: "BO", national: "1234567890123456" })).toBe(
      "+591 12 345 678 9012",
    );
  });

  it("es estable al leer lo que guardó", () => {
    const stored = toStoredPhone({ country: "BR", national: "11912345678" });
    expect(toStoredPhone(parsePhone(stored))).toBe(stored);
  });
});

describe("caretAfterDigits", () => {
  it("ubica el cursor tras el dígito pedido, saltando los espacios", () => {
    expect(caretAfterDigits("7123 4567", 4)).toBe(4);
    expect(caretAfterDigits("7123 4567", 5)).toBe(6);
    expect(caretAfterDigits("7123 4567", 0)).toBe(0);
    expect(caretAfterDigits("7123", 9)).toBe(4);
  });
});

describe("todos los países", () => {
  it("trae los 245 con Bolivia primero, nombre en español y bandera", () => {
    expect(PHONE_COUNTRIES).toHaveLength(245);
    expect(PHONE_COUNTRIES[0]).toEqual({
      iso: "BO",
      dialCode: "591",
      name: "Bolivia",
      flag: "🇧🇴",
    });
    expect(PHONE_COUNTRIES.find((c) => c.iso === "DE")?.name).toBe("Alemania");
    expect(new Set(PHONE_COUNTRIES.map((c) => c.iso)).size).toBe(245);
  });

  it("lee un país sin patrón propio y lo agrupa de forma genérica", () => {
    expect(parsePhone("+49 30 1234567")).toEqual({
      country: "DE",
      national: "301234567",
    });
    expect(toStoredPhone({ country: "DE", national: "301234567" })).toBe(
      "+49 30 123 4567",
    );
  });

  it("en un código compartido usa el país principal o el elegido", () => {
    expect(parsePhone("+1 416 555 0123").country).toBe("US");
    expect(parsePhone("+1 416 555 0123", "CA").country).toBe("CA");
    expect(parsePhone("+44 20 7946 0958", "BO").country).toBe("GB");
    expect(parsePhone("+591 7123 4567", "CA").country).toBe("BO");
  });
});
