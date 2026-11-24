export const DEFAULT_DOSE_SECONDS = '10';
export const MAX_DOSE_SECONDS = 60;
export const MAX_MANUAL_OPEN_SECONDS = 86400;

export function durationInRange(value, max = MAX_DOSE_SECONDS) {
  const input = value.trim();
  const seconds = Number(input);
  if (!/^\d+$/.test(input) || seconds < 1 || seconds > max)
    throw new Error(`Indica un tiempo entre 1 y ${max} segundos.`);
  return seconds;
}

export function doseLabel({ durationSeconds, targetGrams }) {
  return durationSeconds == null
    ? `${targetGrams} g objetivo`
    : `${durationSeconds} s`;
}
