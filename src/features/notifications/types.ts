// src/features/notifications/types.ts
// Tipos de presentación de la bandeja de avisos de la app.

export type InboxNotice = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  isRead: boolean;
};

export type InboxSummary = { unread: number; notices: InboxNotice[] };
