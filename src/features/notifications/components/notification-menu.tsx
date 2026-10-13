// src/features/notifications/components/notification-menu.tsx
// Campana de avisos de la barra superior: contador de no leídos, últimos avisos y marcar como leídos.
// Abrir un aviso lo marca como leído y lleva a su enlace.
"use client";

import { Bell, CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { markInboxRead } from "../actions/mark-inbox-read";
import type { InboxNotice, InboxSummary } from "../types";

// POR QUÉ: zona horaria fija para que el servidor y el navegador rendericen la misma hora.
const dateTime = new Intl.DateTimeFormat("es-BO", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/La_Paz",
});

export function NotificationMenu({ summary }: { summary: InboxSummary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { unread, notices } = summary;

  const openNotice = (notice: InboxNotice) =>
    startTransition(async () => {
      if (!notice.isRead) await markInboxRead({ ids: [notice.id] });
      if (notice.link) router.push(notice.link);
      router.refresh();
    });
  const markAll = () =>
    startTransition(async () => {
      await markInboxRead({ all: true });
      router.refresh();
    });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={unread > 0 ? `Avisos: ${unread} sin leer` : "Avisos"}
          />
        }
      >
        <Bell aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[min(22rem,calc(100vw-2rem))]"
      >
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {unread > 0 ? `Avisos · ${unread} sin leer` : "Avisos"}
          </DropdownMenuLabel>
          {notices.length === 0 && (
            <p className="px-1.5 py-6 text-center text-sm text-muted-foreground">
              Aquí verás los envíos, aprobaciones y rechazos de tus CV.
            </p>
          )}
          {notices.map((notice) => (
            <DropdownMenuItem
              key={notice.id}
              onClick={() => openNotice(notice)}
              disabled={isPending}
              className="items-start gap-2 py-2"
            >
              <span
                aria-hidden="true"
                className={`mt-1.5 size-2 shrink-0 rounded-full ${notice.isRead ? "bg-transparent" : "bg-primary"}`}
              />
              <span className="grid min-w-0 gap-0.5">
                <span className={notice.isRead ? "" : "font-medium"}>
                  {notice.title}
                </span>
                {notice.body && (
                  <span className="line-clamp-2 text-xs text-muted-foreground">
                    {notice.body}
                  </span>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {dateTime.format(new Date(notice.createdAt))}
                </span>
              </span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        {unread > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={markAll} disabled={isPending}>
              <CheckCheck aria-hidden="true" />
              Marcar todo como leído
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
