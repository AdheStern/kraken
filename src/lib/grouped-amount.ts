// src/lib/grouped-amount.ts
// Separador de miles mientras se escribe un monto: el campo muestra «1,234,567.89» y guarda «1234567.89».
// La coma agrupa miles y el punto es el decimal, como el resto de Kraken y el Excel del CV.
import { parseDecimalText } from "@/domain/sales-control/parse-decimal-text";

const PLAIN = /^-?\d*(\.\d*)?$/;
const SIGNIFICANT = /[\d.-]/;

export function groupAmount(raw: string): string {
  if (!PLAIN.test(raw)) return raw;
  const [integer, fraction] = raw.split(".");
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

type Typed = {
  text: string;
  caret: number;
  data: string | null;
  isPaste: boolean;
};

// POR QUÉ: el teclado numérico en español escribe «,» como decimal; una coma tecleada sin punto previo es el
// decimal. Lo pegado pasa por parseDecimalText («1.234,56» de Excel → «1234.56»). Lo que no es número se deja
// como está para que la validación lo marque.
export function readTypedAmount({ text, caret, data, isPaste }: Typed): {
  raw: string;
  caret: number;
} {
  let typed = text;
  if (data === "," && !isPaste && caret > 0 && typed[caret - 1] === ",") {
    const rest = typed.slice(0, caret - 1) + typed.slice(caret);
    typed = rest.includes(".")
      ? rest
      : `${typed.slice(0, caret - 1)}.${typed.slice(caret)}`;
    if (rest.includes(".")) caret -= 1;
  }
  const before = countSignificant(typed.slice(0, caret));
  const stripped = typed.replace(/,/g, "");
  const raw = isPaste
    ? (parseDecimalText(typed) ?? typed)
    : PLAIN.test(stripped)
      ? stripped
      : typed;
  return { raw, caret: caretAfter(groupAmount(raw), before) };
}

function countSignificant(text: string): number {
  return [...text].filter((char) => SIGNIFICANT.test(char)).length;
}

function caretAfter(display: string, significant: number): number {
  if (significant === 0) return 0;
  let seen = 0;
  for (let i = 0; i < display.length; i++) {
    if (SIGNIFICANT.test(display[i])) seen++;
    if (seen === significant) return i + 1;
  }
  return display.length;
}
