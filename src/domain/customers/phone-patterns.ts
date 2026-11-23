// src/domain/customers/phone-patterns.ts
// Cómo se separa en bloques el número nacional de los países con los que DIMA trata más; el resto usa un
// agrupamiento genérico (ver formatNationalPhone).

export type PhonePattern = { length: number; lead?: RegExp; groups: number[] };

export const PHONE_PATTERNS: Readonly<Record<string, PhonePattern[]>> = {
  // POR QUÉ: el celular (6 o 7) va en dos bloques de 4; el fijo lleva antes el código de departamento.
  BO: [
    { length: 8, lead: /^[67]/, groups: [4, 4] },
    { length: 8, groups: [1, 3, 4] },
  ],
  AR: [
    { length: 10, groups: [2, 4, 4] },
    { length: 11, groups: [1, 2, 4, 4] },
  ],
  BR: [
    { length: 10, groups: [2, 4, 4] },
    { length: 11, groups: [2, 5, 4] },
  ],
  CL: [{ length: 9, groups: [1, 4, 4] }],
  PY: [{ length: 9, groups: [3, 3, 3] }],
  PE: [{ length: 9, groups: [3, 3, 3] }],
  CO: [{ length: 10, groups: [3, 3, 4] }],
  EC: [{ length: 9, groups: [2, 3, 4] }],
  UY: [{ length: 8, groups: [2, 3, 3] }],
  VE: [{ length: 10, groups: [3, 3, 4] }],
  MX: [{ length: 10, groups: [2, 4, 4] }],
  PA: [{ length: 8, groups: [4, 4] }],
  CR: [{ length: 8, groups: [4, 4] }],
  US: [{ length: 10, groups: [3, 3, 4] }],
  CA: [{ length: 10, groups: [3, 3, 4] }],
  ES: [{ length: 9, groups: [3, 3, 3] }],
  CN: [{ length: 11, groups: [3, 4, 4] }],
};
