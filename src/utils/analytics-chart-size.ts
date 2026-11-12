export function analyticsChartSize(width: number, leftInset: number, rightInset: number) {
  return Math.min(280, Math.max(80, width - leftInset - rightInset - 48));
}
