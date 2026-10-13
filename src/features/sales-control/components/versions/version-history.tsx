// src/features/sales-control/components/versions/version-history.tsx
// Historial de versiones del CV: quién y cuándo, motivo, estado y acceso a ver o comparar (AGENTS.md §2.3).
import Link from "next/link";
import type { CvVersionSummary } from "../../types";
import { CvStatusBadge } from "../cv-status-badge";

const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export function VersionHistory({
  cvId,
  versions,
  current,
}: {
  cvId: string;
  versions: CvVersionSummary[];
  current: number;
}) {
  if (versions.length < 2) return null;
  return (
    <section
      className="rounded-xl border bg-card"
      aria-label="Historial de versiones"
    >
      <h2 className="border-b px-5 py-3 text-sm font-semibold">
        Historial de versiones
      </h2>
      <ol className="divide-y">
        {versions.map((version) => (
          <li
            key={version.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm"
          >
            <Link
              href={`/cv/${cvId}?v=${version.number}`}
              className={`font-medium tabular-nums hover:underline ${version.number === current ? "text-primary" : ""}`}
            >
              {version.label}
            </Link>
            <CvStatusBadge status={version.status} />
            <span className="text-xs text-muted-foreground">
              {version.createdByName} ·{" "}
              {dateTime.format(new Date(version.createdAt))}
            </span>
            {version.number > 1 && (
              <Link
                href={`/cv/${cvId}/comparar?de=${version.number - 1}&a=${version.number}`}
                className="ml-auto text-xs text-primary hover:underline"
              >
                Comparar con v{version.number - 1}
              </Link>
            )}
            {version.reason && (
              <p className="basis-full text-muted-foreground">
                Motivo: {version.reason}
              </p>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
