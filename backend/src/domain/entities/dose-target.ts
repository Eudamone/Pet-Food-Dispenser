export const MAX_DOSE_SECONDS = 60;
export const MAX_MANUAL_OPEN_SECONDS = 24 * 60 * 60;

export function validateDoseTarget(
  grams: number | null,
  seconds: number | null,
): void {
  if (seconds !== null) {
    if (grams !== null)
      throw new Error('Indica el objetivo en una sola unidad.');
    if (!Number.isInteger(seconds) || seconds < 1 || seconds > MAX_DOSE_SECONDS)
      throw new Error(
        `La duración debe estar entre 1 y ${MAX_DOSE_SECONDS} segundos.`,
      );
    return;
  }
  if (grams === null || !Number.isFinite(grams) || grams <= 0)
    throw new Error('El objetivo debe ser positivo.');
}
