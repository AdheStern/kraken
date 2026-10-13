// src/features/auth/components/brand-panel.tsx
// Campo azul DIMA del login: la red con el kraken al centro y el wordmark "Kraken by DIMA".
// En móvil se reduce a una banda superior sin rótulos.
import Image from "next/image";
import { ModuleChips } from "./module-chips";
import { NetworkGraph } from "./network-graph";

export function BrandPanel() {
  return (
    <section
      aria-label="Kraken by DIMA"
      className="kr-panel relative isolate flex h-[42svh] min-h-72 flex-col overflow-hidden text-white lg:h-auto lg:min-h-dvh"
    >
      <Wordmark />
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-16 lg:pt-10 lg:pr-36 lg:pb-44 lg:pl-12">
        <div className="relative aspect-square h-full max-w-full lg:h-auto lg:w-full lg:max-w-[min(640px,64vh)]">
          <NetworkGraph className="size-full overflow-visible" />
          <div className="hidden lg:block">
            <ModuleChips />
          </div>
        </div>
      </div>
    </section>
  );
}

function Wordmark() {
  return (
    <div className="z-10 px-4 pt-4 lg:absolute lg:bottom-12 lg:left-12 lg:p-0">
      <p className="font-display text-2xl leading-none tracking-[-0.02em] lg:text-7xl">
        Kraken
      </p>
      <p className="mt-1.5 flex items-center gap-2 text-xs text-white/80 lg:mt-3 lg:text-sm">
        by
        <Image
          src="/brand/dima-logo-white.png"
          alt="DIMA"
          width={1980}
          height={472}
          className="h-3.5 w-auto lg:h-5"
          priority
        />
      </p>
      <p className="mt-5 hidden max-w-sm text-sm leading-relaxed text-balance text-white/80 lg:block [@media(max-height:780px)]:lg:hidden">
        Control de venta, horas, tickets e inventario de DIMA en un solo lugar.
      </p>
    </div>
  );
}
