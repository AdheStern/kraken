// src/proxy.ts
// Redirección optimista por cookie de sesión: sin sesión → /login; con sesión, /login → inicio.
// LIMITACIÓN: solo mira la cookie; cada página valida la sesión real en el servidor.
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

const LOGIN_PATH = "/login";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = getSessionCookie(request) !== null;
  const isLogin = pathname === LOGIN_PATH;

  if (isLogin && hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  if (!isLogin && !hasSession) {
    const url = new URL(LOGIN_PATH, request.url);
    if (pathname !== "/")
      url.searchParams.set("callbackURL", pathname + search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|api/health|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|opengraph-image|brand/|.*\\.(?:png|svg|jpg|ico|webp)$).*)",
  ],
};
