/**
 * Converts a UTC date string to a Date object whose local values
 * represent the time in America/Bogota (UTC-5).
 * This ensures date-fns `format()` outputs Bogotá time regardless
 * of the browser's timezone.
 */
export function toBogotaDate(utcString: string): Date {
  const date = new Date(utcString);
  const bogotaStr = date.toLocaleString('en-US', { timeZone: 'America/Bogota' });
  return new Date(bogotaStr);
}
