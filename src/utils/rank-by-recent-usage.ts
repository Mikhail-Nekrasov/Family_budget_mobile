type UsageStats = {
  count: number;
  latestIndex: number;
};

export function rankByRecentUsage<T>(
  items: readonly T[],
  recentIds: readonly string[],
  getId: (item: T) => string,
): T[] {
  const usage = new Map<string, UsageStats>();

  recentIds.forEach((id, index) => {
    const existing = usage.get(id);

    if (existing) {
      existing.count += 1;
    } else {
      usage.set(id, {
        count: 1,
        latestIndex: index,
      });
    }
  });

  return items
    .map((item, originalIndex) => ({
      item,
      originalIndex,
      usage: usage.get(getId(item)),
    }))
    .sort((first, second) => {
      const frequencyDifference =
        (second.usage?.count ?? 0) -
        (first.usage?.count ?? 0);

      if (frequencyDifference !== 0) {
        return frequencyDifference;
      }

      const recencyDifference =
        (first.usage?.latestIndex ?? Number.POSITIVE_INFINITY) -
        (second.usage?.latestIndex ?? Number.POSITIVE_INFINITY);

      if (
        first.usage &&
        second.usage &&
        recencyDifference !== 0
      ) {
        return recencyDifference;
      }

      return first.originalIndex - second.originalIndex;
    })
    .map(({ item }) => item);
}