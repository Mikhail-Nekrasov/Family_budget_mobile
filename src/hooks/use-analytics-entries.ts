import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';

import type { Account } from '@/models/account';
import type { Category } from '@/models/category';
import type { Entry } from '@/models/entry';
import type { EntryPeriod } from '@/models/entry-period';
import type { EntryType } from '@/models/entry-type';
import { getAccounts, getArchivedAccounts } from '@/repositories/account-repository';
import { getCategories } from '@/repositories/category-repository';
import { getEntries } from '@/repositories/entry-repository';
import { getPrimaryCurrency } from '@/repositories/preferences-repository';
import { periodBounds } from '@/utils/entry-period';

type Data = { entries: Entry[]; accounts: Account[]; categories: Category[]; currency: string };
const EMPTY: Data = { entries: [], accounts: [], categories: [], currency: 'EUR' };

export function useAnalyticsEntries(type: EntryType | 'SUMMARY', period: EntryPeriod, categoryId?: string, accountIds?: readonly string[]) {
  const database = useSQLiteContext();
  const [revision, setRevision] = useState(0);
  const queryKey = JSON.stringify([type, period, categoryId, accountIds, revision]);
  const [result, setResult] = useState<{ key: string; data: Data | null } | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    async function load() {
      try {
        const bounds = periodBounds(period);
        const types: EntryType[] = type === 'SUMMARY' ? ['EXPENSE', 'INCOME'] : [type];
        const [accounts, archived, categories, entryLists, currency] = await Promise.all([
          getAccounts(database),
          getArchivedAccounts(database),
          type === 'SUMMARY' ? Promise.resolve([]) : getCategories(database, type),
          Promise.all(types.map((entryType) => getEntries(database, {
            type: entryType,
            ...bounds,
            accountSyncIds: accountIds,
            categorySyncIds: categoryId ? [categoryId] : undefined,
          }))),
          categoryId ? Promise.resolve('EUR') : getPrimaryCurrency(database),
        ]);
        const entries = entryLists.flat();
        if (active) setResult({ key: queryKey, data: { accounts: [...accounts, ...archived], categories, entries, currency } });
      } catch (error) {
        console.warn('Failed to load analytics entries', error);
        if (active) setResult({ key: queryKey, data: null });
      }
    }
    void load();
    return () => { active = false; };
  }, [database, type, period, categoryId, accountIds, queryKey]));

  const current = result?.key === queryKey ? result : null;
  return {
    data: current?.data ?? EMPTY,
    accounts: result?.data?.accounts ?? EMPTY.accounts,
    loading: current === null,
    failed: current?.data === null,
    reload: () => setRevision((value) => value + 1),
  };
}
