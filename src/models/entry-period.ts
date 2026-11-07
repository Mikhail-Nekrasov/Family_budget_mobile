export type EntryPeriod =
  | { kind: 'day'; date: string }
  | { kind: 'week'; date: string }
  | { kind: 'month'; year: number; month: number }
  | { kind: 'year'; year: number }
  | { kind: 'all' }
  | { kind: 'range'; from: string; through: string };