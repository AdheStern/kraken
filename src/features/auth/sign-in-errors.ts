// src/features/auth/sign-in-errors.ts
// Traduce los errores de Better Auth (códigos y estados HTTP) a mensajes que dicen qué hacer.

type SignInError = { status?: number; code?: string };

const MESSAGES = {
  invalidCredentials: "Correo o contraseña incorrectos.",
  tooManyAttempts: "Demasiados intentos. Espera un minuto e intenta de nuevo.",
  accountDisabled:
    "Tu cuenta está desactivada. Contacta al administrador del sistema.",
  microsoft:
    "No pudimos validar tu cuenta de Microsoft. Intenta de nuevo o contacta al administrador del sistema.",
  unexpected:
    "No pudimos iniciar sesión. Revisa tu conexión e intenta de nuevo.",
} as const;

export function toAdminSignInMessage(error: SignInError): string {
  if (error.status === 429) return MESSAGES.tooManyAttempts;
  if (error.code === "ACCOUNT_DISABLED") return MESSAGES.accountDisabled;
  if (error.status === 401 || error.status === 400)
    return MESSAGES.invalidCredentials;
  return MESSAGES.unexpected;
}

// TRAMPA: el callback OAuth devuelve el código en `?error=` con formatos variables (snake o mayúsculas).
export function toOAuthErrorMessage(code: string): string {
  if (/disabled/i.test(code)) return MESSAGES.accountDisabled;
  return MESSAGES.microsoft;
}
