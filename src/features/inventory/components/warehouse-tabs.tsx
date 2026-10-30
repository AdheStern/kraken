// src/features/inventory/components/warehouse-tabs.tsx
// Pestañas de almacén del inventario como enlaces (?almacen=CODIGO): se comparten y funcionan sin JavaScript.
import { GooeyNav } from "@/components/ui/gooey-nav";
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
    <GooeyNav
      label="Almacenes"
      active={activeCode}
      items={tabs.map((tab) => {
        const query = new URLSearchParams({
          almacen: tab.code,
          ...(search ? { q: search } : {}),
        });
        return { key: tab.code, label: tab.name, href: `${basePath}?${query}` };
      })}
    />
  );
}
