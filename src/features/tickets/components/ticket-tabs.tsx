// src/features/tickets/components/ticket-tabs.tsx
// Pestañas de trabajo del detalle: subtareas, registros de tiempo, bolsas con su jerarquía, comentarios, adjuntos e
// historial (AGENTS.md §5 "Detalle del ticket").
"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TicketBagsPanel, TicketDetail, TicketTime } from "../types";
import { AttachmentsPanel } from "./attachments-panel";
import { CommentsPanel } from "./comments-panel";
import { HistoryPanel } from "./history-panel";
import { SubtasksPanel } from "./subtasks-panel";
import { TicketBagsTab } from "./ticket-bags-tab";
import { TimeEntriesPanel } from "./time-entries-panel";

type Props = { detail: TicketDetail; bags: TicketBagsPanel; time: TicketTime };

export function TicketTabs({ detail, bags, time }: Props) {
  const isFinished =
    detail.ticket.status === "CERRADO" || detail.ticket.status === "CANCELADO";
  return (
    <Tabs defaultValue="subtareas" className="gap-4">
      {/* TRAMPA: una lista centrada que desborda corta la primera pestaña; en el móvil se alinea al inicio. */}
      <TabsList className="w-full justify-start overflow-x-auto sm:w-fit">
        <TabsTrigger value="subtareas">
          Subtareas <Count value={detail.subtasks.length} />
        </TabsTrigger>
        <TabsTrigger value="registros">
          Registros <Count value={time.entries.length} />
        </TabsTrigger>
        <TabsTrigger value="bolsas">
          Bolsas <Count value={bags.hierarchy.length} />
        </TabsTrigger>
        <TabsTrigger value="comentarios">
          Comentarios <Count value={detail.comments.length} />
        </TabsTrigger>
        <TabsTrigger value="adjuntos">
          Adjuntos <Count value={detail.attachments.length} />
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

function Count({ value }: { value: number }) {
  return (
    <span className="text-xs tabular-nums text-muted-foreground">{value}</span>
  );
}
