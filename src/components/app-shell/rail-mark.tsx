// src/components/app-shell/rail-mark.tsx
// Isotipo del riel con el ánimo del kraken: atento cuando el usuario tiene aprobaciones esperándolo.
// Va dentro de un <Suspense> porque lee la sesión.
import { KrakenMark } from "@/components/brand/kraken-mark";
import { listPendingApprovals } from "@/features/sales-control/queries/list-pending-approvals";
import { canApproveCvs } from "@/server/authz/cv-permissions";
import { requireUser } from "@/server/session";

export async function RailMark() {
  const user = await requireUser();
  const pending = canApproveCvs(user)
    ? (await listPendingApprovals(user)).length
    : 0;
  return (
    <KrakenMark
      className="size-9 shrink-0"
      mood={pending > 0 ? "alert" : "idle"}
    />
  );
}
