export type EntryPeriod =
  | { kind: 'month'; year: number; month: number }
  | { kind: 'year'; year: number }
  | { kind: 'all' }
  | { kind: 'range'; from: string; through: string };
