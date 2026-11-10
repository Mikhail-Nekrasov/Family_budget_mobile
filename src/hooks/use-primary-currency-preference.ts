import { useSQLiteContext } from 'expo-sqlite';
import { useCallback } from 'react';

import { startupPreloadEnabled } from '@/components/startup-layout';
import { useFocusedList } from '@/hooks/use-focused-list';
import { getPrimaryCurrency } from '@/repositories/preferences-repository';

export function usePrimaryCurrencyPreference() {
  const database = useSQLiteContext();
  const load = useCallback(async () => [await getPrimaryCurrency(database)], [database]);
  const { rows, status } = useFocusedList('primary', load, false, startupPreloadEnabled);
  return { currency: rows[0] ?? null, status };
}
