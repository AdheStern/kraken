// src/features/notifications/components/notification-bell.tsx
// Carga la bandeja del usuario para la campana de la barra superior. Va dentro de un <Suspense>.
import { requireUser } from "@/server/session";
import { getInbox } from "../queries/get-inbox";
import { NotificationMenu } from "./notification-menu";

export async function NotificationBell() {
  const user = await requireUser();
  return <NotificationMenu summary={await getInbox(user)} />;
}
