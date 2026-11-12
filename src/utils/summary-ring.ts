export const SUMMARY_OUTER_RADIUS = 82;
export const SUMMARY_RING_WIDTH = 22;
const INNER_RADIUS = 56;

export type SummarySelection = 'income' | 'expenses' | 'savings';

export type SummarySector = {
  id: SummarySelection;
  radius: number;
  start: number;
  fraction: number;
};

export function summarySectors(income: number, expenses: number): SummarySector[] {
  if (expenses >= income) {
    if (expenses === 0) return [];
    return [
      { id: 'expenses', radius: SUMMARY_OUTER_RADIUS, start: 0, fraction: 1 },
      ...(income > 0 && income < expenses
        ? [{ id: 'income' as const, radius: INNER_RADIUS, start: 0, fraction: income / expenses }]
        : []),
    ];
  }

  const share = expenses / income;
  return [
    { id: 'savings', radius: SUMMARY_OUTER_RADIUS, start: share, fraction: 1 - share },
    ...(share > 0
      ? [{ id: 'expenses' as const, radius: SUMMARY_OUTER_RADIUS, start: 0, fraction: share }]
      : []),
  ];
}

export function visibleSummarySectors(
  sectors: readonly SummarySector[],
  selected: SummarySelection | null,
  splitRing: boolean,
  incomeOnly: boolean,
): SummarySector[] {
  if (incomeOnly && selected === 'income') {
    return sectors.map((sector) => ({ ...sector, id: 'income' }));
  }

  if (splitRing && selected === 'income') {
    return [...sectors, { id: 'income', radius: SUMMARY_OUTER_RADIUS, start: 0, fraction: 1 }];
  }

  if (splitRing && (selected === 'expenses' || selected === 'savings')) {
    return sectors.flatMap((sector): SummarySector[] => sector.id === selected
      ? [
          { ...sector, id: 'income' },
          { ...sector, radius: INNER_RADIUS },
        ]
      : [sector]);
  }

  return [...sectors];
}

export function summarySectorWidth(id: SummarySelection): number {
  return id === 'income' ? SUMMARY_RING_WIDTH * 2 / 3 : SUMMARY_RING_WIDTH;
}

export function summarySelectionAt(
  x: number,
  y: number,
  sectors: readonly SummarySector[],
): SummarySelection | 'center' | null {
  const distance = Math.hypot(x, y);
  const fraction = (Math.atan2(y, x) / (2 * Math.PI) + 1.25) % 1;

  for (const sector of [...sectors].reverse()) {
    if (Math.abs(distance - sector.radius) <= summarySectorWidth(sector.id) / 2 &&
        fraction >= sector.start && fraction < sector.start + sector.fraction) {
      return sector.id;
    }
  }

  const innerEdge = Math.min(
    SUMMARY_OUTER_RADIUS,
    ...sectors.map((sector) => sector.radius - summarySectorWidth(sector.id) / 2),
  );
  return distance < innerEdge ? 'center' : null;
}
