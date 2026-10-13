// src/components/forms/form-field.tsx
// Etiqueta, control, ayuda y error de un campo de formulario, enlazados para lectores de pantalla.
import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

type Props = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: Props) {
  return (
    <div className={`grid content-start gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor} className="text-[13px] text-muted-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
