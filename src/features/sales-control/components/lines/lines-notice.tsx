// src/features/sales-control/components/lines/lines-notice.tsx
// Aviso del editor de líneas: resultado de la última acción o recordatorio de cambios sin guardar.

export type LinesNoticeValue = { tone: "info" | "error"; text: string } | null;

export function LinesNotice({
  notice,
  isDirty,
}: {
  notice: LinesNoticeValue;
  isDirty: boolean;
}) {
  return (
    <p aria-live="polite" className="min-h-5 text-sm">
      {notice ? (
        <span
          className={
            notice.tone === "error" ? "text-destructive" : "text-success"
          }
        >
          {notice.text}
        </span>
      ) : isDirty ? (
        <span className="text-muted-foreground">
          Cambios sin guardar · Ctrl+S para guardar. Pega bloques desde Excel en
          cualquier celda.
        </span>
      ) : null}
    </p>
  );
}
