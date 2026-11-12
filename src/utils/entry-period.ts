import type { EntryPeriod } from '@/models/entry-period';
import { toCalendarPickerDate } from '@/utils/calendar-date';

export const MIN_PERIOD_YEAR = 1900;
export const MAX_PERIOD_YEAR = 2100;

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

export function entryDateLimits(now = new Date()): {
  minimumDate: Date;
  maximumDate: Date;
} {
  const minimumDate = localDay(MIN_PERIOD_YEAR, 0, 1);

  const maximumDate = localDay(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + 1,
  );
  maximumDate.setMilliseconds(-1);

  const technicalMaximum = localDay(
    MAX_PERIOD_YEAR + 1,
    0,
    1,
  );
  technicalMaximum.setMilliseconds(-1);

  return {
    minimumDate,
    maximumDate:
      maximumDate < technicalMaximum
        ? maximumDate
        : technicalMaximum,
  };
}

export function isEntryDateAllowed(
  value: Date,
  now = new Date(),
): boolean {
  if (!Number.isFinite(value.getTime())) {
    return false;
  }

  const { minimumDate, maximumDate } = entryDateLimits(now);

  return value >= minimumDate && value <= maximumDate;
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

export function weekDates(
  date: string,
): { from: Date; through: Date } {
  const from = parsePeriodDate(date);

  const daysSinceMonday = (from.getDay() + 6) % 7;
  from.setDate(from.getDate() - daysSinceMonday);

  const through = new Date(from.getTime());
  through.setDate(through.getDate() + 6);

  return { from, through };
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

  if (period.kind === 'day' || period.kind === 'week') {
    const from = period.kind === 'day'
      ? parsePeriodDate(period.date)
      : weekDates(period.date).from;

    if (from > today) {
      throw new Error('Period must not begin in the future');
    }

    const to = new Date(from.getTime());

    to.setDate(
      to.getDate() + (period.kind === 'day' ? 1 : 7),
    );

    return {
      from,
      to: to < tomorrow ? to : tomorrow,
    };
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

export function initialEntryDateForPeriod(period: EntryPeriod, now = new Date()): Date {
  const { from, to } = periodBounds(period, now);
  if (!from || !to) return new Date(now);

  let date = from;
  if (period.kind === 'month' || period.kind === 'year') {
    const month = period.kind === 'month' ? period.month : now.getMonth();
    const candidate = localDay(period.year, month, now.getDate());
    if (candidate.getMonth() === month && candidate >= from && candidate < to) {
      date = candidate;
    }
  }

  if (date === from && period.kind !== 'day') {
    const start = new Date(Math.max(from.getTime(), entryDateLimits(now).minimumDate.getTime()));
    const calendarDay = (value: Date) => Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
    const days = (calendarDay(to) - calendarDay(start)) / 86_400_000;
    start.setDate(start.getDate() + Math.floor((days - 1) / 2));
    date = start;
  }

  date.setHours(now.getHours(), now.getMinutes(), 0, 0);
  return date;
}

export function shiftPeriod(period: EntryPeriod, direction: -1 | 1, now = new Date()): EntryPeriod {
  if (period.kind === 'all' || period.kind === 'range') {
    return period;
  }

  if (period.kind === 'day' || period.kind === 'week') {
    const date = period.kind === 'day'
      ? parsePeriodDate(period.date)
      : weekDates(period.date).from;

    date.setDate(
      date.getDate() +
        direction * (period.kind === 'day' ? 1 : 7),
    );

    return isEntryDateAllowed(date, now)
      ? {
          kind: period.kind,
          date: localDateKey(date),
        }
      : period;
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

export function formatEntryPeriod(
  period: EntryPeriod,
  locale: string,
  allTimeLabel: string,
): string {
  if (period.kind === 'all') {
    return allTimeLabel;
  }

  if (period.kind === 'day') {
    return new Intl.DateTimeFormat(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(
      toCalendarPickerDate(
        parsePeriodDate(period.date),
        true,
      ),
    );
  }

  if (period.kind === 'week') {
    const { from, through } = weekDates(period.date);

    const formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const fromLabel = formatter.format(
      toCalendarPickerDate(from, true),
    );

    const throughLabel = formatter.format(
      toCalendarPickerDate(through, true),
    );

    return `${fromLabel} – ${throughLabel}`;
  }

  if (period.kind === 'range') {
    const formatter = new Intl.DateTimeFormat(locale, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC',
    });

    const from = toCalendarPickerDate(
      parsePeriodDate(period.from),
      true,
    );

    const through = toCalendarPickerDate(
      parsePeriodDate(period.through),
      true,
    );

    return `${formatter.format(from)} – ${formatter.format(through)}`;
  }

  const date = toCalendarPickerDate(
    localDay(
      period.year,
      period.kind === 'month' ? period.month : 0,
      1,
    ),
    true,
  );

  return new Intl.DateTimeFormat(
    locale,
    period.kind === 'month'
      ? {
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }
      : {
          year: 'numeric',
          timeZone: 'UTC',
        },
  ).format(date);
}
