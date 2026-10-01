export function formatNumber(n: number, locale?: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

export function formatDate(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(iso));
}

export function formatTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(iso));
}

export function formatDateTime(iso: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
}

export function timeZoneLabel(iso: string, locale?: string): string {
  const part = new Intl.DateTimeFormat(locale, { timeZoneName: 'short' })
    .formatToParts(new Date(iso))
    .find((p) => p.type === 'timeZoneName');
  return part?.value ?? '';
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000], ['month', 2_592_000], ['week', 604_800], ['day', 86_400], ['hour', 3_600], ['minute', 60],
];

export function formatRelative(iso: string, now: Date = new Date(), locale?: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const seconds = Math.round((new Date(iso).getTime() - now.getTime()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return rtf.format(Math.round(seconds / size), unit);
  }
  return rtf.format(0, 'minute');
}

export function greeting(now: Date): 'Good morning' | 'Good afternoon' | 'Good evening' {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? '';
}

export function plural(n: number, one: string, many: string, locale?: string): string {
  return `${formatNumber(n, locale)} ${n === 1 ? one : many}`;
}
