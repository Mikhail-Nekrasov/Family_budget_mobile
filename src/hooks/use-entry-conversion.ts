import { useNetworkState } from 'expo-network';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import type { Account } from '@/models/account';
import type { Entry } from '@/models/entry';
import type { ExchangeRateSnapshot } from '@/models/exchange-rate-snapshot';
import type { CachedHistoricalRate } from '@/models/historical-exchange-rate';
import { getExchangeRateSnapshot } from '@/repositories/exchange-rate-repository';
import { getHistoricalRates } from '@/repositories/historical-exchange-rate-repository';
import { calculateEntryTotals } from '@/services/entry-summary-service';
import { ensureDailyExchangeRates } from '@/services/exchange-rate-service';
import {
    getHistoricalRequests,
    refreshHistoricalRates,
} from '@/services/historical-exchange-rate-service';

type Props = {
  entries: readonly Entry[];
  accounts: readonly Account[];
  primaryCurrency: string;
  enabled: boolean;
  splitByType?: boolean;
};

export function useEntryConversion({
  entries, accounts, primaryCurrency, enabled, splitByType = false,
}: Props) {
  const database = useSQLiteContext();
  const network = useNetworkState();
  const online = network.isConnected === true && network.isInternetReachable !== false;
  const [appState, setAppState] = useState(AppState.currentState);
  const [current, setCurrent] = useState<ExchangeRateSnapshot | null>(null);
  const [historical, setHistorical] = useState<CachedHistoricalRate[]>([]);
  const [refreshingCurrent, setRefreshingCurrent] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const requests = useMemo(
    () => getHistoricalRequests(entries, accounts, primaryCurrency),
    [entries, accounts, primaryCurrency],
  );

  useFocusEffect(useCallback(() => {
    let active = true;
    async function loadCurrent() {
      setRefreshingCurrent(true);
      try {
        const cached = await getExchangeRateSnapshot(database);
        if (active) {
          setCurrent(cached);
        }
        if (active && online && appState === 'active') {
          const updated = await ensureDailyExchangeRates(database);
          if (active && updated) {
            setCurrent(updated);
          }
        }
      } catch (error) {
        console.warn('Failed to load current exchange rates', error);
      } finally {
        if (active) {
          setRefreshingCurrent(false);
        }
      }
    }
    void loadCurrent();
    return () => { active = false; };
  }, [database, online, appState]));

  useEffect(() => {
    let active = true;
    async function readCache() {
      const rows = await getHistoricalRates(database, [...requests.keys()]);
      if (active) {
        setHistorical(rows);
      }
    }
    async function loadHistory() {
      setRefreshingHistory(true);
      try {
        await readCache();
        if (active && enabled && online && appState === 'active') {
          await refreshHistoricalRates(database, requests, readCache, () => active);
          if (active) {
            await readCache();
          }
        }
      } catch (error) {
        console.warn('Failed to load historical exchange rates', error);
      } finally {
        if (active) {
          setRefreshingHistory(false);
        }
      }
    }
    void loadHistory();
    return () => { active = false; };
  }, [database, requests, enabled, online, appState]);

  const totals = useMemo(
    () => splitByType ? null : calculateEntryTotals(entries, accounts, primaryCurrency, historical, current),
    [entries, accounts, primaryCurrency, historical, current, splitByType],
  );
  const byType = useMemo(() => {
    if (!splitByType) return null;
    const income = entries.filter((entry) => entry.type === 'INCOME');
    const expenses = entries.filter((entry) => entry.type === 'EXPENSE');
    return {
      income: calculateEntryTotals(income, accounts, primaryCurrency, historical, current),
      expenses: calculateEntryTotals(expenses, accounts, primaryCurrency, historical, current),
    };
  }, [entries, accounts, primaryCurrency, historical, current, splitByType]);
  return {
    categoryTotals: totals?.categoryTotals ?? new Map<string, number>(),
    conversionIncomplete: totals?.conversionIncomplete ??
      (byType?.income.conversionIncomplete === true || byType?.expenses.conversionIncomplete === true),
    approximate: totals?.approximate ?? (byType?.income.approximate === true || byType?.expenses.approximate === true),
    totalMinor: totals?.totalMinor ?? 0,
    byType,
    loading: refreshingCurrent || refreshingHistory,
  };
}
