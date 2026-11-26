// src/components/forms/use-grouped-amount.ts
// Conecta un campo de monto con el separador de miles: muestra «1,234.56», entrega «1234.56» y deja el cursor
// tras el mismo dígito aunque las comas se muevan (grouped-amount.ts).
"use client";

import { type ChangeEvent, useLayoutEffect, useRef } from "react";
import { groupAmount, readTypedAmount } from "@/lib/grouped-amount";

export function useGroupedAmount(
  value: string,
  onValueChange: (raw: string) => void,
) {
  const ref = useRef<HTMLInputElement>(null);
  const pendingCaret = useRef<number | null>(null);

  // TRAMPA: al reagrupar, React escribe el valor nuevo y el cursor saltaría al final; se repone tras pintar.
  useLayoutEffect(() => {
    const caret = pendingCaret.current;
    pendingCaret.current = null;
    const field = ref.current;
    if (caret !== null && field && document.activeElement === field)
      field.setSelectionRange(caret, caret);
  });

  function onChange(event: ChangeEvent<HTMLInputElement>) {
    const native = event.nativeEvent as InputEvent;
    const field = event.target;
    const read = readTypedAmount({
      text: field.value,
      caret: field.selectionStart ?? field.value.length,
      data: native.data ?? null,
      isPaste: native.inputType === "insertFromPaste",
    });
    pendingCaret.current = read.caret;
    onValueChange(read.raw);
  }

  return { ref, value: groupAmount(value), onChange };
}
