// src/components/motion/count-up.tsx
// Cifra que cuenta desde 0 hasta su valor al aparecer (NumberFlow); con reduced motion muestra el valor directo.
"use client";

import NumberFlow from "@number-flow/react";
import { useEffect, useState } from "react";

type Props = { value: number; className?: string };

export function CountUp({ value, className }: Props) {
  const [shown, setShown] = useState(0);
  // POR QUÉ: NumberFlow anima los cambios de valor; arrancar en 0 tras montar hace que la cifra cuente.
  useEffect(() => setShown(value), [value]);
  return (
    <NumberFlow
      value={shown}
      locales="es-BO"
      className={className}
      transformTiming={{
        duration: 900,
        easing: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      spinTiming={{ duration: 900, easing: "cubic-bezier(0.16, 1, 0.3, 1)" }}
    />
  );
}
