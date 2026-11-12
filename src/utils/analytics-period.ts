import type { EntryPeriod } from '@/models/entry-period';
import { entryDateLimits, localDateKey, parsePeriodDate, periodBounds, shiftPeriod } from '@/utils/entry-period';

export type QuickPeriod = 'day' | 'week' | 'month' | 'year';

export function periodAt(kind: QuickPeriod, anchor: Date): EntryPeriod {
  switch (kind) {
    case 'day':
    case 'week':
      return { kind, date: localDateKey(anchor) };
    case 'month':
      return { kind, year: anchor.getFullYear(), month: anchor.getMonth() };
    case 'year':
      return { kind, year: anchor.getFullYear() };
  }
}

export function shiftAnchor(kind: QuickPeriod, anchor: Date, direction: -1 | 1, now = new Date()): Date {
  const period = periodAt(kind, anchor);
  const shifted = shiftPeriod(period, direction, now);
  if (shifted === period) return anchor;

  const date = new Date(anchor);
  if (shifted.kind === 'day' || shifted.kind === 'week') {
    date.setDate(date.getDate() + direction * (kind === 'day' ? 1 : 7));
  } else if (shifted.kind === 'year' || shifted.kind === 'month') {
    const day = date.getDate();
    date.setDate(1);
    date.setFullYear(shifted.year, shifted.kind === 'month' ? shifted.month : date.getMonth());
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1, 0);
    date.setDate(Math.min(day, end.getDate()));
  }
  const { maximumDate } = entryDateLimits(now);
  return date > maximumDate ? maximumDate : date;
}

export function decodeAnalyticsPeriod(serialized: string | undefined): EntryPeriod | null {
  if (!serialized) return null;
  try {
    const candidate = JSON.parse(serialized) as Partial<EntryPeriod> | null;
    if (!candidate) return null;
    let period: EntryPeriod;
    switch (candidate.kind) {
      case 'all':
        period = { kind: 'all' };
        break;
      case 'day':
      case 'week':
        if (typeof candidate.date !== 'string') return null;
        parsePeriodDate(candidate.date);
        period = { kind: candidate.kind, date: candidate.date };
        break;
      case 'month':
        if (typeof candidate.year !== 'number' || typeof candidate.month !== 'number') return null;
        period = { kind: 'month', year: candidate.year, month: candidate.month };
        break;
      case 'year':
        if (typeof candidate.year !== 'number') return null;
        period = { kind: 'year', year: candidate.year };
        break;
      case 'range':
        if (typeof candidate.from !== 'string' || typeof candidate.through !== 'string') return null;
        period = { kind: 'range', from: candidate.from, through: candidate.through };
        break;
      default:
        return null;
    }
    periodBounds(period);
    return period;
  } catch {
    return null;
  }
}
