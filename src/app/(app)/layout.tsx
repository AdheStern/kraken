// src/app/(app)/layout.tsx
// Shell de la aplicación autenticada: riel azul DIMA con navegación y usuario, y el área de trabajo.
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-shell/app-sidebar";
import { SidebarUser } from "@/components/app-shell/sidebar-user";
import { ModeToggle } from "@/components/theme/mode-toggle";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <SidebarProvider>
      <AppSidebar
        user={
          <Suspense
            fallback={<Skeleton className="h-11 w-full bg-sidebar-accent" />}
          >
            <SidebarUser />
          </Suspense>
        }
      />
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-12 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur">
          <SidebarTrigger aria-label="Mostrar u ocultar la navegación" />
          <div className="ml-auto">
            <ModeToggle className="size-8" />
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
