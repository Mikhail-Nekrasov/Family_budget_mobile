import type { Category } from '@/models/category';

export function getCategoryPreviewIds(
  ranked: readonly Category[],
  lastUsedId: string | undefined,
): string[] {
  const result = ranked.slice(0, 2).map((category) => category.syncId);
  const candidate = ranked.find((category) => category.syncId === lastUsedId);
  if (candidate && !result.includes(candidate.syncId)) {
    result.push(candidate.syncId);
  }
  for (const category of ranked) {
    if (result.length === 3) {
      break;
    }
    if (!result.includes(category.syncId)) {
      result.push(category.syncId);
    }
  }
  return result;
}
