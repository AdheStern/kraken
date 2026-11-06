// src/components/shortcuts/shortcut-match.ts
// Reconoce un atajo a partir de las teclas: combinaciones («Ctrl+K», «Alt+N», «?», «/») y secuencias de dos
// teclas («G C»). Puro: lo usa el proveedor de atajos y se prueba sin navegador.

export type KeyLike = {
  key: string;
  code: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
};

export type SequenceState = { prefix: string | null; at: number };

export const SEQUENCE_TIMEOUT_MS = 1_000;
export const IDLE: SequenceState = { prefix: null, at: 0 };

const LETTER = /^[A-Z]$/;

// POR QUÉ: las letras se comparan por la tecla física (event.code); con Alt, macOS cambia el carácter (Alt+N = ˜).
export function matchesCombo(combo: string, event: KeyLike): boolean {
  const parts = combo.split("+");
  const key = parts.pop() ?? "";
  const ctrl = parts.includes("Ctrl");
  const alt = parts.includes("Alt");
  if (ctrl !== (event.ctrlKey || event.metaKey) || alt !== event.altKey)
    return false;
  if (LETTER.test(key))
    return (
      event.code === `Key${key}` && parts.includes("Shift") === event.shiftKey
    );
  return event.key === key;
}

export function isModified(combo: string): boolean {
  return combo.includes("Ctrl+") || combo.includes("Alt+");
}

// Devuelve el atajo que completó esta tecla (si alguno) y el nuevo estado de la secuencia en curso.
export function resolveShortcut(
  combos: readonly string[],
  event: KeyLike,
  state: SequenceState,
  now: number,
): { match: string | null; state: SequenceState } {
  const plain = !event.ctrlKey && !event.metaKey && !event.altKey;
  const letter = event.code.startsWith("Key") ? event.code.slice(3) : "";
  const pending =
    state.prefix && now - state.at <= SEQUENCE_TIMEOUT_MS ? state.prefix : null;
  if (pending && plain && letter) {
    const sequence = `${pending} ${letter}`;
    if (combos.includes(sequence)) return { match: sequence, state: IDLE };
  }
  if (plain && letter && combos.some((c) => c.startsWith(`${letter} `)))
    return { match: null, state: { prefix: letter, at: now } };
  const match = combos.find((c) => !c.includes(" ") && matchesCombo(c, event));
  return { match: match ?? null, state: IDLE };
}
