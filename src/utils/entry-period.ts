import type { EntryPeriod } from '@/models/entry-period';

export const MIN_PERIOD_YEAR = 1;
export const MAX_PERIOD_YEAR = 9998;

function validateYear(year: number): void {
  if (!Number.isInteger(year) || year < MIN_PERIOD_YEAR || year > MAX_PERIOD_YEAR) {
    throw new Error('Invalid period year');
  }
}

function localDay(year: number, month: number, day: number): Date {
  const result = new Date(0);
  result.setFullYear(year, month, day);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function localDateKey(date: Date): string {
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Invalid period date');
  }
  validateYear(date.getFullYear());
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parsePeriodDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('Invalid period date');
  }
  const [year, month, day] = value.split('-').map(Number);
  validateYear(year);
  const result = localDay(year, month - 1, day);
  if (localDateKey(result) !== value) {
    throw new Error('Invalid period date');
  }
  return result;
}

export function currentMonthPeriod(now = new Date()): EntryPeriod {
  return { kind: 'month', year: now.getFullYear(), month: now.getMonth() };
}

export function periodBounds(period: EntryPeriod, now = new Date()): { from?: Date; to?: Date } {
  const today = localDay(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime());
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (period.kind === 'all') {
    return { to: tomorrow };
  }
  if (period.kind === 'range') {
    const from = parsePeriodDate(period.from);
    const to = parsePeriodDate(period.through);
    if (period.from > period.through) {
      throw new Error('Period end must not precede its start');
    }
    if (to > today) {
      throw new Error('Period must not include future dates');
    }
    to.setDate(to.getDate() + 1);
    return { from, to };
  }
  validateYear(period.year);
  if (period.kind === 'month' && (!Number.isInteger(period.month) || period.month < 0 || period.month > 11)) {
    throw new Error('Invalid period month');
  }
  const from = localDay(period.year, period.kind === 'month' ? period.month : 0, 1);
  if (from > today) {
    throw new Error('Period must not begin in the future');
  }
  const end = period.kind === 'year'
    ? localDay(period.year + 1, 0, 1)
    : localDay(period.year, period.month + 1, 1);
  return { from, to: end < tomorrow ? end : tomorrow };
}

export function shiftPeriod(period: EntryPeriod, direction: -1 | 1, now = new Date()): EntryPeriod {
  if (period.kind === 'all' || period.kind === 'range') {
    return period;
  }
  if (period.kind === 'year') {
    const year = period.year + direction;
    return year >= MIN_PERIOD_YEAR && year <= Math.min(MAX_PERIOD_YEAR, now.getFullYear())
      ? { ...period, year }
      : period;
  }
  const shifted = localDay(period.year, period.month + direction, 1);
  const year = shifted.getFullYear();
  return year >= MIN_PERIOD_YEAR && year <= MAX_PERIOD_YEAR &&
    shifted <= localDay(now.getFullYear(), now.getMonth(), 1)
    ? { kind: 'month', year, month: shifted.getMonth() }
    : period;
}

export function formatEntryPeriod(period: EntryPeriod, locale: string, allTimeLabel: string): string {
  if (period.kind === 'all') {
    return allTimeLabel;
  }
  if (period.kind === 'range') {
    const formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    return `${formatter.format(parsePeriodDate(period.from))} – ${formatter.format(parsePeriodDate(period.through))}`;
  }
  return new Intl.DateTimeFormat(locale, period.kind === 'month'
    ? { month: 'long', year: 'numeric' }
    : { year: 'numeric' },
  ).format(localDay(period.year, period.kind === 'month' ? period.month : 0, 1));
}
