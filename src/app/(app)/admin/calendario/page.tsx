// src/app/(app)/admin/calendario/page.tsx
// Calendario de negocio: horario por ciudad, horarios de oficina y feriados con que se ponderan las horas
// de los tickets (AGENTS.md §2.5, §5 Administración). Solo para el administrador del sistema.
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ModuleHeading } from "@/components/app-shell/module-heading";
import { Skeleton } from "@/components/ui/skeleton";
import { toBusinessYear } from "@/domain/calendar/business-date";
import { AdminBackLink } from "@/features/admin/components/admin-back-link";
import { CitySchedules } from "@/features/calendar/components/city-schedules";
import { HolidaysPanel } from "@/features/calendar/components/holidays-panel";
import { NewSchedule } from "@/features/calendar/components/new-schedule";
import { ScheduleEditor } from "@/features/calendar/components/schedule-editor";
import { getCalendarAdmin } from "@/features/calendar/queries/get-calendar-admin";
import { canManageSystem } from "@/server/authz/admin-permissions";
import { systemClock } from "@/server/clock";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Calendario de negocio" };

export default function CalendarAdminPage({
  searchParams,
}: PageProps<"/admin/calendario">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <AdminBackLink />
      <ModuleHeading
        title="Calendario de negocio"
        description="En una bolsa 8x5, cada minuto fuera de estas franjas o en un feriado descuenta el doble. Se usa el horario de la ciudad del ticket."
      />
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        <CalendarAdmin searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function CalendarAdmin({
  searchParams,
}: Pick<PageProps<"/admin/calendario">, "searchParams">) {
  const user = await requireUser();
  if (!canManageSystem(user)) notFound();
  const params = await searchParams;
  const currentYear = toBusinessYear(systemClock.now());
  const requested = Number(params.anio);
  const year =
    Number.isInteger(requested) && requested > 2000 ? requested : currentYear;
  const data = await getCalendarAdmin(year);
  return (
    <>
      <section className="grid gap-3" aria-labelledby="ciudades">
        <h2 id="ciudades" className="text-sm font-medium">
          Horario por ciudad
        </h2>
        <CitySchedules cities={data.cities} schedules={data.schedules} />
      </section>
      <section className="grid gap-3" aria-labelledby="horarios">
        <h2 id="horarios" className="text-sm font-medium">
          Horarios de oficina
        </h2>
        {data.schedules.map((schedule) => (
          <ScheduleEditor key={schedule.id} schedule={schedule} />
        ))}
        <NewSchedule />
      </section>
      <section className="grid gap-3" aria-labelledby="feriados">
        <div className="flex items-center gap-2">
          <h2 id="feriados" className="text-sm font-medium">
            Feriados de {year}
          </h2>
          <nav
            className="ml-auto flex items-center gap-1"
            aria-label="Cambiar de año"
          >
            <Link
              href={`?anio=${year - 1}`}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Feriados de ${year - 1}`}
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </Link>
            <Link
              href={`?anio=${year + 1}`}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={`Feriados de ${year + 1}`}
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
        <HolidaysPanel
          year={year}
          holidays={data.holidays}
          cities={data.cities}
        />
      </section>
    </>
  );
}
