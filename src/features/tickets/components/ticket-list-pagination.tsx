// src/features/tickets/components/ticket-list-pagination.tsx
// Pie de la vista de lista de tickets: cuántos se muestran, la paginación con enlaces y las filas por página
// (en la URL, «filas», que vuelve a la página 1).
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { OptionSelect } from "@/components/ui/option-select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { TicketListPage } from "../queries/list-tickets-page";
import {
  DEFAULT_TICKET_PAGE_SIZE,
  TICKET_PAGE_SIZES,
  toTicketListHref,
} from "../schemas/ticket-list-params";

const SIZE_OPTIONS = TICKET_PAGE_SIZES.map((n) => ({
  id: String(n),
  label: `${n} por página`,
}));
const DISABLED = { "aria-disabled": true, tabIndex: -1 } as const;
type PageFacts = Omit<TicketListPage, "rows">;

export function TicketListPagination({ page }: { page: PageFacts }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const hrefFor = (n: number) =>
    toTicketListHref(pathname, params, { pagina: n === 1 ? null : String(n) });
  const isFirst = page.page === 1;
  const isLast = page.page === page.pageCount;
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <output className="text-sm text-muted-foreground tabular-nums">{`Mostrando ${page.firstIndex}–${page.lastIndex} de ${page.total} tickets`}</output>
      {page.pageCount > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href={hrefFor(Math.max(1, page.page - 1))}
                className={isFirst ? "pointer-events-none opacity-50" : ""}
                {...(isFirst ? DISABLED : {})}
              />
            </PaginationItem>
            <PaginationItem>
              <PaginationLink href={hrefFor(page.page)} isActive size="default">
                {`${page.page} de ${page.pageCount}`}
              </PaginationLink>
            </PaginationItem>
            <PaginationItem>
              <PaginationNext
                href={hrefFor(Math.min(page.pageCount, page.page + 1))}
                className={isLast ? "pointer-events-none opacity-50" : ""}
                {...(isLast ? DISABLED : {})}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      <OptionSelect
        value={String(page.pageSize)}
        options={SIZE_OPTIONS}
        size="sm"
        onValueChange={(next) =>
          router.replace(
            toTicketListHref(pathname, params, {
              filas:
                !next || Number(next) === DEFAULT_TICKET_PAGE_SIZE
                  ? null
                  : next,
            }),
            { scroll: false },
          )
        }
        className="w-36"
        aria-label="Filas por página"
      />
    </div>
  );
}
