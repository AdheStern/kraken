// src/features/sales-control/components/cv-sellers-avatars.tsx
// Fotos de los vendedores de un CV en el listado: superpuestas, hasta tres y «+N»; el nombre va en un tooltip y
// como texto para lectores de pantalla.
"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { CvListRow } from "../types";

const MAX_SHOWN = 3;

export function CvSellersAvatars({
  sellers,
}: {
  sellers: CvListRow["sellers"];
}) {
  if (sellers.length === 0)
    return <span className="text-muted-foreground">—</span>;
  const shown = sellers.slice(0, MAX_SHOWN);
  const hidden = sellers.slice(MAX_SHOWN);
  return (
    <AvatarGroup>
      {shown.map((seller) => (
        <Tooltip key={seller.id}>
          <TooltipTrigger render={<Avatar size="sm" />}>
            {seller.image && <AvatarImage src={seller.image} alt="" />}
            <AvatarFallback>{initials(seller.name)}</AvatarFallback>
            <span className="sr-only">{seller.name}</span>
          </TooltipTrigger>
          <TooltipContent>{seller.name}</TooltipContent>
        </Tooltip>
      ))}
      {hidden.length > 0 && (
        <Tooltip>
          <TooltipTrigger render={<Avatar size="sm" />}>
            <AvatarFallback>+{hidden.length}</AvatarFallback>
          </TooltipTrigger>
          <TooltipContent>
            {hidden.map((s) => s.name).join(", ")}
          </TooltipContent>
        </Tooltip>
      )}
    </AvatarGroup>
  );
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
