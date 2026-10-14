// src/app/(app)/template.tsx
// Entrada de cada pantalla de la app: Next vuelve a montar el template en cada navegación, así que los bloques
// de la página entran escalonados una vez por visita (CSS, sin esperar a la hidratación).
export default function AppTemplate({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="kr-enter flex flex-1 flex-col">{children}</div>;
}
