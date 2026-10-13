// src/components/theme/theme-provider.tsx
// Envoltorio cliente de next-themes para usarlo desde el layout raíz (server component).

"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type * as React from "react";

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
