// password-reset.config.ts
// Configuración del enlace y vigencia del token de recuperación de contraseña.

const DEFAULT_TTL_MINUTES = 15;

export function passwordResetTtlMinutes(): number {
  const minutes = Number(process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : DEFAULT_TTL_MINUTES;
}

export function passwordResetExpiresInSeconds(): number {
  return passwordResetTtlMinutes() * 60;
}

export function buildPasswordResetLink(token: string): string {
  const baseUrl = (
    process.env.PASSWORD_RESET_URL ?? 'dispensador://reset-password'
  ).trim();
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
}
