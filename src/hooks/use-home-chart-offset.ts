import { useSyncExternalStore } from 'react';

export const HOME_CHART_TOP_GAP = 4;

const initialHeights = { tabs: 48, period: 44 };
const heights = { ...initialHeights };
const listeners = new Set<() => void>();

export function dashboardChartSize(width: number, leftInset: number, rightInset: number) {
  return Math.min(240, Math.max(80, width - leftInset - rightInset - 40 - 112));
}

export function reportHomeChartRowHeight(row: keyof typeof heights, height: number) {
  if (height <= 0 || heights[row] === height) return;
  heights[row] = height;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function getSnapshot() {
  return heights.tabs + heights.period + HOME_CHART_TOP_GAP;
}

function getServerSnapshot() {
  return initialHeights.tabs + initialHeights.period + HOME_CHART_TOP_GAP;
}

export function useHomeChartOffset() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
