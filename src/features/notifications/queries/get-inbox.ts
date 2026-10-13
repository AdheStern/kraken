// src/features/notifications/queries/get-inbox.ts
// Últimos avisos de la bandeja del usuario y cuántos no ha leído (AGENTS.md §2.3, "notifica … en la bandeja").
import type { SessionUser } from "@/server/authz/roles";
import { scopeInboxQuery } from "@/server/authz/scope-inbox-query";
import { prisma } from "@/server/db";
import type { InboxSummary } from "../types";

const LATEST = 12;

export async function getInbox(user: SessionUser): Promise<InboxSummary> {
  const scope = scopeInboxQuery(user);
  const [unread, items] = await Promise.all([
    prisma.inboxItem.count({ where: { AND: [scope, { readAt: null }] } }),
    prisma.inboxItem.findMany({
      where: scope,
      orderBy: { createdAt: "desc" },
      take: LATEST,
      select: {
        id: true,
        title: true,
        body: true,
        link: true,
        createdAt: true,
        readAt: true,
      },
    }),
  ]);
  return {
    unread,
    notices: items.map((item) => ({
      id: item.id,
      title: item.title,
      body: item.body,
      link: item.link,
      createdAt: item.createdAt.toISOString(),
      isRead: item.readAt !== null,
    })),
  };
}
