// src/features/auth/callback-url.ts
// Normaliza el destino tras iniciar sesión para que solo sea una ruta interna de la app.

// TRAMPA: "//dominio" y "/\dominio" son URLs absolutas para el navegador; abrirían una redirección externa.
export function toSafeCallbackURL(
  value: string | string[] | undefined,
): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate?.startsWith("/") || /^\/[/\\]/.test(candidate)) return "/";
  return candidate;
}
