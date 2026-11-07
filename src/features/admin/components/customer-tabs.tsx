// src/features/admin/components/customer-tabs.tsx
// Pestañas de la ficha del cliente bajo sus datos: contactos y sucursales, con la barra animada de los demás
// módulos (decisión 2026-11-07). Recibe cada panel ya armado; ?pestana= abre una al llegar.
"use client";

import { type ReactNode, useState } from "react";
import { GooeyNav } from "@/components/ui/gooey-nav";
import { Tabs, TabsContent } from "@/components/ui/tabs";

type Props = {
  initial: string;
  branches: ReactNode;
  contacts: ReactNode;
  counts: { branches: number; contacts: number };
};

export function CustomerTabs({ initial, branches, contacts, counts }: Props) {
  const [tab, setTab] = useState(initial);
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(String(value))}
      className="gap-4"
    >
      <GooeyNav
        mode="tabs"
        label="Contactos y sucursales del cliente"
        active={tab}
        items={[
          {
            key: "contactos",
            label: <Label text="Contactos" count={counts.contacts} />,
          },
          {
            key: "sucursales",
            label: <Label text="Sucursales" count={counts.branches} />,
          },
        ]}
      />
      <TabsContent value="contactos">{contacts}</TabsContent>
      <TabsContent value="sucursales">{branches}</TabsContent>
    </Tabs>
  );
}

function Label({ text, count }: { text: string; count: number }) {
  return (
    <>
      {text} <span className="text-xs tabular-nums opacity-70">{count}</span>
    </>
  );
}
