// src/components/forms/money-input.tsx
// Campo de monto con separador de miles al escribir: muestra «12,500.00» y entrega «12500.00» (grouped-amount.ts).
"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { useGroupedAmount } from "./use-grouped-amount";

type Props = Omit<ComponentProps<typeof Input>, "value" | "onChange"> & {
  value: string;
  onValueChange: (raw: string) => void;
};

export function MoneyInput({ value, onValueChange, ...props }: Props) {
  const grouped = useGroupedAmount(value, onValueChange);
  return <Input inputMode="decimal" {...props} {...grouped} />;
}
