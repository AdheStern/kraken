// src/components/app-shell/person-avatar.tsx
// Foto de Microsoft de una persona o, si no tiene, sus iniciales.
import { cn } from "@/lib/utils";

type Props = { name: string; image: string | null; className?: string };

export function PersonAvatar({ name, image, className }: Props) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  return image ? (
    // POR QUÉ: <img> y no next/image: la foto llega como data URL desde Microsoft Graph, no hay nada que optimizar.
    // biome-ignore lint/performance/noImgElement: data URL de la foto de perfil
    <img
      src={image}
      alt=""
      className={cn(
        "size-8 shrink-0 rounded-full object-cover ring-1 ring-border",
        className,
      )}
    />
  ) : (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary",
        className,
      )}
    >
      {initials}
    </span>
  );
}
