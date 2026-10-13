// src/app/(auth)/login/page.tsx
// Pantalla de inicio de sesión: campo de marca con el kraken y tarjeta de acceso (Microsoft o administrador).
import type { Metadata } from "next";
import { Suspense } from "react";
import { ModeToggle } from "@/components/theme/mode-toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { toSafeCallbackURL } from "@/features/auth/callback-url";
import { BrandPanel } from "@/features/auth/components/brand-panel";
import { KrakenMoodProvider } from "@/features/auth/components/kraken-mood";
import { LoginCard } from "@/features/auth/components/login-card";
import { toOAuthErrorMessage } from "@/features/auth/sign-in-errors";

export const metadata: Metadata = { title: "Iniciar sesión" };

const ON_PANEL_TOGGLE =
  "kr-glass-chip size-9 rounded-full border-white/25 bg-white/12 hover:bg-white/20 hover:text-white dark:bg-white/12 dark:hover:bg-white/20";

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <KrakenMoodProvider className="relative grid flex-1 grid-rows-[auto_1fr] lg:grid-cols-12 lg:grid-rows-none">
      <div className="lg:col-span-7">
        <BrandPanel />
      </div>
      <ModeToggle
        className={`absolute top-4 right-4 z-20 lg:hidden ${ON_PANEL_TOGGLE}`}
      />

      <div className="relative z-10 -mt-14 flex items-start justify-center px-4 pb-10 lg:col-span-5 lg:mt-0 lg:items-center lg:justify-start lg:pr-10 lg:pb-0 lg:pl-0">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 hidden bg-[radial-gradient(60%_50%_at_0%_45%,var(--ground-glow),transparent)] lg:block"
        />
        <ModeToggle className="kr-glass absolute top-6 right-6 hidden size-9 rounded-full lg:inline-flex" />
        <Suspense fallback={<LoginCardFallback />}>
          <div className="flex w-full justify-center lg:-ml-[clamp(5rem,9vw,8rem)] lg:w-auto">
            <LoginCardLoader searchParams={searchParams} />
          </div>
        </Suspense>
      </div>
    </KrakenMoodProvider>
  );
}

async function LoginCardLoader({
  searchParams,
}: Pick<PageProps<"/login">, "searchParams">) {
  const params = await searchParams;
  const error =
    typeof params.error === "string" ? toOAuthErrorMessage(params.error) : null;
  return (
    <LoginCard
      callbackURL={toSafeCallbackURL(params.callbackURL)}
      initialError={error}
    />
  );
}

function LoginCardFallback() {
  return (
    <div className="kr-glass grid w-full max-w-100 gap-3 rounded-2xl p-6 sm:p-8">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-64" />
      <Skeleton className="mt-3 h-12 w-full" />
      <Skeleton className="mt-6 h-5 w-48" />
    </div>
  );
}
