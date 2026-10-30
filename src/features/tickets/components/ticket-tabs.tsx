// src/features/tickets/components/ticket-tabs.tsx
// Pestañas de trabajo del detalle: resumen (solo cerrado, y abre en él), subtareas, registros de tiempo, bolsas
// con su jerarquía, materiales, comentarios, adjuntos e historial (AGENTS.md §5 "Detalle del ticket").
"use client";

import { useState } from "react";
import { GooeyNav } from "@/components/ui/gooey-nav";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import type { TicketMaterials } from "@/features/inventory/queries/list-ticket-materials";
import type { TicketSummary } from "../queries/get-ticket-summary";
import type { TicketBagsPanel, TicketDetail, TicketTime } from "../types";
import { AttachmentsPanel } from "./attachments-panel";
import { CommentsPanel } from "./comments-panel";
import { HistoryPanel } from "./history-panel";
import { MaterialsPanel } from "./materials-panel";
import { SubtasksPanel } from "./subtasks-panel";
import { TicketBagsTab } from "./ticket-bags-tab";
import { TicketSummaryPanel } from "./ticket-summary-panel";
import { TimeEntriesPanel } from "./time-entries-panel";

type Props = {
  detail: TicketDetail;
  bags: TicketBagsPanel;
  time: TicketTime;
  materials: TicketMaterials;
  summary: TicketSummary | null;
};

export function TicketTabs({ detail, bags, time, materials, summary }: Props) {
  const isFinished =
    detail.ticket.status === "CERRADO" || detail.ticket.status === "CANCELADO";
  const [tab, setTab] = useState(summary ? "resumen" : "subtareas");
  const items = [
    ...(summary ? [{ key: "resumen", label: "Resumen" }] : []),
    {
      key: "subtareas",
      label: <Label text="Subtareas" count={detail.subtasks.length} />,
    },
    {
      key: "registros",
      label: <Label text="Registros" count={time.entries.length} />,
    },
    {
      key: "bolsas",
      label: <Label text="Bolsas" count={bags.hierarchy.length} />,
    },
    {
      key: "materiales",
      label: <Label text="Materiales" count={materials.items.length} />,
    },
    {
      key: "comentarios",
      label: <Label text="Comentarios" count={detail.comments.length} />,
    },
    {
      key: "adjuntos",
      label: <Label text="Adjuntos" count={detail.attachments.length} />,
    },
    { key: "historial", label: "Historial" },
  ];
  return (
    <Tabs
      value={tab}
      onValueChange={(value) => setTab(String(value))}
      className="gap-4"
    >
      <GooeyNav
        mode="tabs"
        label="Secciones del ticket"
        items={items}
        active={tab}
      />
      {summary && (
        <TabsContent value="resumen">
          <TicketSummaryPanel summary={summary} />
        </TabsContent>
      )}
      <TabsContent value="subtareas">
        <SubtasksPanel
          ticketId={detail.ticket.id}
          subtasks={detail.subtasks}
          engineers={detail.engineers}
          canManage={detail.permissions.canManage && !isFinished}
          viewerId={detail.permissions.viewerId}
          time={time}
        />
      </TabsContent>
      <TabsContent value="registros">
        <TimeEntriesPanel ticketId={detail.ticket.id} time={time} />
      </TabsContent>
      <TabsContent value="bolsas">
        <TicketBagsTab
          ticketId={detail.ticket.id}
          panel={bags}
          canManage={detail.permissions.canManage && !isFinished}
          canApplyPending={detail.permissions.canClose}
        />
      </TabsContent>
      <TabsContent value="materiales">
        <MaterialsPanel materials={materials} />
      </TabsContent>
      <TabsContent value="comentarios">
        <CommentsPanel
          ticketId={detail.ticket.id}
          comments={detail.comments}
          canComment={detail.permissions.canComment}
        />
      </TabsContent>
      <TabsContent value="adjuntos">
        <AttachmentsPanel
          ticketId={detail.ticket.id}
          attachments={detail.attachments}
          canAttach={
            detail.permissions.canComment &&
            detail.ticket.status !== "CANCELADO"
          }
          filesEnabled={detail.filesEnabled}
        />
      </TabsContent>
      <TabsContent value="historial">
        <HistoryPanel history={detail.history} />
      </TabsContent>
    </Tabs>
  );
}

// POR QUÉ: el conteo hereda el color de la pestaña (también sobre el azul de la elegida), solo más tenue.
function Label({ text, count }: { text: string; count: number }) {
  return (
    <>
      {text} <span className="text-xs tabular-nums opacity-70">{count}</span>
    </>
  );
}
