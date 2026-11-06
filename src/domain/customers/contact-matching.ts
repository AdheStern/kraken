// src/domain/customers/contact-matching.ts
// ¿El contacto que se va a crear ya existe, en este cliente o en otro? Coincide por correo, por teléfono o por un
// nombre que contiene al otro (decisión 2026-11-06). Puro: la query trae candidatos y aquí se decide.
import {
  normalizeContactName,
  normalizeEmail,
  normalizePhone,
} from "./contact-normalize";

export type MatchReason = "CORREO" | "TELEFONO" | "NOMBRE";

export type MatchCandidate = {
  contactId: string;
  personId: string;
  name: string;
  email: string | null;
  phone: string | null;
  customerId: string;
  customerName: string;
  position: string | null;
  isActive: boolean;
};

export type ContactMatch = MatchCandidate & { reasons: MatchReason[] };

const WEIGHT: Record<MatchReason, number> = {
  CORREO: 3,
  TELEFONO: 2,
  NOMBRE: 1,
};

export function findContactMatches(
  input: { name: string; email: string | null; phone: string | null },
  candidates: readonly MatchCandidate[],
): ContactMatch[] {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  const name = normalizeContactName(input.name);
  const matches = candidates.flatMap((c): ContactMatch[] => {
    const reasons: MatchReason[] = [];
    if (email && normalizeEmail(c.email) === email) reasons.push("CORREO");
    if (phone && normalizePhone(c.phone) === phone) reasons.push("TELEFONO");
    if (isSameName(name, normalizeContactName(c.name))) reasons.push("NOMBRE");
    return reasons.length ? [{ ...c, reasons }] : [];
  });
  return onePerPerson(matches).sort(
    (a, b) => score(b) - score(a) || Number(b.isActive) - Number(a.isActive),
  );
}

// POR QUÉ: «jose perez» y «jose luis perez» son probablemente la misma persona; con un solo nombre no se arriesga.
function isSameName(a: string, b: string): boolean {
  if (a === b) return a.length > 0;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  const tokens = short.split(" ");
  const others = new Set(long.split(" "));
  return tokens.length >= 2 && tokens.every((t) => others.has(t));
}

// Una persona aparece una vez: su puesto activo si lo tiene, si no el que más coincide.
function onePerPerson(matches: ContactMatch[]): ContactMatch[] {
  const best = new Map<string, ContactMatch>();
  for (const m of matches) {
    const current = best.get(m.personId);
    if (!current || rank(m) > rank(current)) best.set(m.personId, m);
  }
  return [...best.values()];
}

function rank(m: ContactMatch): number {
  return Number(m.isActive) * 10 + score(m);
}

function score(m: ContactMatch): number {
  return m.reasons.reduce((sum, r) => sum + WEIGHT[r], 0);
}
