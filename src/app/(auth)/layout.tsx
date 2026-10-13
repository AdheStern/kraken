// src/app/(auth)/layout.tsx
// Layout de las pantallas de acceso: ocupan toda la ventana, sin la navegación de la app.

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <main className="flex min-h-dvh flex-1 flex-col">{children}</main>;
}
