// src/features/admin/components/customer-tabs.tsx
// Pestañas de la ficha del cliente: datos, sucursales y contactos (decisión 2026-11-06). Recibe cada panel ya
// armado; ?pestana= abre una al llegar.
"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  initial: string;
  data: ReactNode;
  branches: ReactNode;
  contacts: ReactNode;
  counts: { branches: number; contacts: number };
};

export function CustomerTabs({
  initial,
  data,
  branches,
  contacts,
  counts,
}: Props) {
  return (
    <Tabs defaultValue={initial} className="gap-4">
      <TabsList>
        <TabsTrigger value="datos" className="px-4">
          Datos
        </TabsTrigger>
        <TabsTrigger value="sucursales" className="px-4">
          Sucursales · {counts.branches}
        </TabsTrigger>
        <TabsTrigger value="contactos" className="px-4">
          Contactos · {counts.contacts}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="datos">{data}</TabsContent>
      <TabsContent value="sucursales">{branches}</TabsContent>
      <TabsContent value="contactos">{contacts}</TabsContent>
    </Tabs>
  );
}
