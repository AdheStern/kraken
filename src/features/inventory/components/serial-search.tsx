// src/features/inventory/components/serial-search.tsx
// Buscador del recorrido de un serial: escrito, con el lector (actúa como teclado) o con la cámara (?serial=).
"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { CameraScanDialog } from "@/components/scan/camera-scan-dialog";
import { Input } from "@/components/ui/input";

export function SerialSearch({ defaultValue }: { defaultValue: string }) {
  const router = useRouter();
  const go = (serial: string) =>
    router.push(`/inventario/seriales?serial=${encodeURIComponent(serial)}`);

  return (
    <search className="flex w-full max-w-xl items-center gap-2">
      <form action="/inventario/seriales" className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          name="serial"
          type="search"
          defaultValue={defaultValue}
          placeholder="Serial del equipo"
          aria-label="Serial del equipo"
          autoFocus
          className="h-10 pl-9 font-mono"
        />
      </form>
      <CameraScanDialog
        once
        label="Leer el serial con la cámara"
        triggerClassName="h-10 px-3"
        onScan={(text) => {
          go(text);
          return { ok: true, message: `Buscando ${text}…` };
        }}
      />
    </search>
  );
}
