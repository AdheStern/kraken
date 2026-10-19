// src/features/tickets/components/ticket-tabs.tsx
// Pestañas de trabajo del detalle: subtareas, bolsas con su jerarquía, comentarios e historial
// (AGENTS.md §5 "Detalle del ticket"; los adjuntos se difieren hasta el FileStore, ADR-16).
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TicketBagsPanel, TicketDetail } from "../types";
import { CommentsPanel } from "./comments-panel";
import { HistoryPanel } from "./history-panel";
import { SubtasksPanel } from "./subtasks-panel";
import { TicketBagsTab } from "./ticket-bags-tab";

type Props = { detail: TicketDetail; bags: TicketBagsPanel };

export function TicketTabs({ detail, bags }: Props) {
  const isFinished =
    detail.ticket.status === "CERRADO" || detail.ticket.status === "CANCELADO";
  return (
    <Tabs defaultValue="subtareas" className="gap-4">
      <TabsList className="w-full overflow-x-auto sm:w-fit">
        <TabsTrigger value="subtareas">
          Subtareas <Count value={detail.subtasks.length} />
        </TabsTrigger>
        <TabsTrigger value="bolsas">
          Bolsas <Count value={bags.hierarchy.length} />
        </TabsTrigger>
        <TabsTrigger value="comentarios">
          Comentarios <Count value={detail.comments.length} />
        </TabsTrigger>
        <TabsTrigger value="historial">Historial</TabsTrigger>
      </TabsList>
      <TabsContent value="subtareas">
        <SubtasksPanel
          ticketId={detail.ticket.id}
          subtasks={detail.subtasks}
          engineers={detail.engineers}
          canManage={detail.permissions.canManage && !isFinished}
          viewerId={detail.permissions.viewerId}
        />
      </TabsContent>
      <TabsContent value="bolsas">
        <TicketBagsTab
          ticketId={detail.ticket.id}
          panel={bags}
          canManage={detail.permissions.canManage && !isFinished}
          canApplyPending={detail.permissions.canClose}
        />
      </TabsContent>
      <TabsContent value="comentarios">
        <CommentsPanel
          ticketId={detail.ticket.id}
          comments={detail.comments}
          canComment={detail.permissions.canComment}
        />
      </TabsContent>
      <TabsContent value="historial">
        <HistoryPanel history={detail.history} />
      </TabsContent>
    </Tabs>
  );
}

function Count({ value }: { value: number }) {
  return (
    <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
  );
}
