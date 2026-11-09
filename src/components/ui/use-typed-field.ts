// src/components/ui/use-typed-field.ts
// Texto editable de un campo que se valida al salir o con Enter (fechas escritas a mano): si es válido se
// confirma ya normalizado; si no, vuelve al último valor válido. Mientras se escribe, marca si es inválido.
import { type KeyboardEvent, useState } from "react";

type Options = {
  // El valor confirmado, tal como se muestra.
  shown: string;
  // Texto normalizado si es aceptable, o null si no lo es.
  read: (text: string) => string | null;
  commit: (normalized: string) => void;
};

export function useTypedField({ shown, read, commit }: Options) {
  const [text, setText] = useState(shown);
  const [synced, setSynced] = useState(shown);
  if (synced !== shown) {
    setSynced(shown);
    setText(shown);
  }

  function confirm() {
    const normalized = read(text);
    if (normalized === null) return setText(shown);
    setText(normalized);
    if (normalized !== shown) commit(normalized);
  }

  return {
    invalid: text !== shown && read(text) === null,
    value: text,
    onChange: (event: { target: { value: string } }) =>
      setText(event.target.value),
    onBlur: confirm,
    onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== "Enter" || text === shown) return;
      // POR QUÉ: confirmar antes de que Enter envíe el formulario con el valor anterior.
      event.preventDefault();
      confirm();
    },
  };
}
