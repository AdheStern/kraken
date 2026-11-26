// src/features/sales-control/components/cv-list-pagination.tsx
// Pie del listado de CV: cuántos se muestran, filas por página y la paginación de shadcn con enlaces.
"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { toCvListHref } from "../schemas/cv-list-params";
import type { CvListPage } from "../types";
import { CvListPageSize } from "./cv-list-page-size";
import { rememberCvListHref } from "./use-remembered-cv-list";

const DISABLED = { "aria-disabled": true, tabIndex: -1 } as const;

export function CvListPagination({
  page,
  query,
}: {
  page: Omit<CvListPage, "rows">;
  query: string;
}) {
  const params = new URLSearchParams(query);
  const hrefFor = (n: number) =>
    toCvListHref(params, { pagina: n === 1 ? null : String(n) });
  // TRAMPA: la página 1 sin filtros es «/cv» a secas; sin guardarla antes, el listado repone la página recordada.
  const linkTo = (n: number) => {
    const href = hrefFor(n);
    return { href, onClick: () => rememberCvListHref(href) };
  };
  const isFirst = page.page === 1;
  const isLast = page.page === page.pageCount;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
      <output className="text-sm text-muted-foreground tabular-nums">{`Mostrando ${page.firstIndex}–${page.lastIndex} de ${page.total} CV`}</output>
      {page.pageCount > 1 && (
        <Pagination className="mx-0 w-auto">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                {...linkTo(Math.max(1, page.page - 1))}
                className={isFirst ? "pointer-events-none opacity-50" : ""}
                {...(isFirst ? DISABLED : {})}
              />
            </PaginationItem>
            {pageItems(page.page, page.pageCount).map((item, index) => (
              <PaginationItem key={item ?? `gap-${index}`}>
                {item === null ? (
                  <PaginationEllipsis />
                ) : (
                  <PaginationLink
                    {...linkTo(item)}
                    isActive={item === page.page}
                    aria-label={`Página ${item}`}
                  >
                    {item}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                {...linkTo(Math.min(page.pageCount, page.page + 1))}
                className={isLast ? "pointer-events-none opacity-50" : ""}
                {...(isLast ? DISABLED : {})}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
      <CvListPageSize value={page.pageSize} />
    </div>
  );
}

// Primera, última y las vecinas de la actual; null marca un salto («…»).
function pageItems(current: number, count: number): (number | null)[] {
  const shown = [...new Set([1, current - 1, current, current + 1, count])]
    .filter((n) => n >= 1 && n <= count)
    .sort((a, b) => a - b);
  return shown.flatMap((n, i) => {
    const previous = shown[i - 1];
    if (previous === undefined || n - previous === 1) return [n];
    return n - previous === 2 ? [previous + 1, n] : [null, n];
  });
}
