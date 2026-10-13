// src/components/theme/mode-toggle.tsx
// Menú para elegir el tema de la interfaz: claro, oscuro o el del sistema.

"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Trigger = DropdownMenuTrigger as React.ComponentType<
  React.ComponentPropsWithoutRef<typeof DropdownMenuTrigger> & {
    asChild?: boolean;
  }
>;

export function ModeToggle() {
  const { setTheme } = useTheme();

  return (
    <DropdownMenu>
      <Trigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </Trigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
