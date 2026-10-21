// src/features/inventory/components/warehouse-tabs.tsx
// Pestañas de almacén del inventario como enlaces (?almacen=CODIGO): se comparten y funcionan sin JavaScript.
import Link from "next/link";
import { cn } from "@/lib/utils";
import type { WarehouseTab } from "../types";

type Props = {
  tabs: WarehouseTab[];
  activeCode: string;
  search: string;
  basePath?: string;
};

export function WarehouseTabs({
  tabs,
  activeCode,
  search,
  basePath = "/inventario",
}: Props) {
  return (
    <nav aria-label="Almacenes" className="-mx-1 overflow-x-auto px-1">
      <ul className="flex w-max gap-1 rounded-xl bg-muted/60 p-1">
        {tabs.map((tab) => {
          const isActive = tab.code === activeCode;
          const query = new URLSearchParams({
            almacen: tab.code,
            ...(search ? { q: search } : {}),
          });
          return (
            <li key={tab.id}>
              <Link
                href={`${basePath}?${query}`}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none motion-reduce:transition-none",
                  isActive && "bg-background text-foreground shadow-sm",
                )}
              >
                {tab.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
