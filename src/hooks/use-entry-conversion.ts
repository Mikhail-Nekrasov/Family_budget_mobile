import { useNetworkState } from 'expo-network';
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
import { refreshExchangeRates } from '@/services/exchange-rate-service';
import {
    getHistoricalRequests,
    refreshHistoricalRates,
} from '@/services/historical-exchange-rate-service';

type Props = {
  entries: readonly Entry[];
  accounts: readonly Account[];
  primaryCurrency: string;
  enabled: boolean;
};

export function useEntryConversion({
  entries, accounts, primaryCurrency, enabled,
}: Props) {
  const database = useSQLiteContext();
  const network = useNetworkState();
  const online = network.isConnected === true && network.isInternetReachable !== false;
  const [appState, setAppState] = useState(AppState.currentState);
  const [refreshToken, setRefreshToken] = useState(0);
  const [current, setCurrent] = useState<ExchangeRateSnapshot | null>(null);
  const [historical, setHistorical] = useState<CachedHistoricalRate[]>([]);
  const [refreshingCurrent, setRefreshingCurrent] = useState(false);
  const [refreshingHistory, setRefreshingHistory] = useState(false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  const refresh = useCallback(() => setRefreshToken((token) => token + 1), []);
  const requests = useMemo(
    () => getHistoricalRequests(entries, accounts, primaryCurrency),
    [entries, accounts, primaryCurrency],
  );

  useEffect(() => {
    let active = true;
    async function loadCurrent() {
      setRefreshingCurrent(true);
      try {
        const cached = await getExchangeRateSnapshot(database);
        if (active) {
          setCurrent(cached);
        }
        if (active && online && appState === 'active') {
          const updated = await refreshExchangeRates(database);
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
  }, [database, online, appState, refreshToken]);

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
  }, [database, requests, enabled, online, appState, refreshToken]);

  const totals = useMemo(
    () => calculateEntryTotals(entries, accounts, primaryCurrency, historical, current),
    [entries, accounts, primaryCurrency, historical, current],
  );
  return {
    ...totals,
    refresh,
    refreshing: refreshingCurrent || refreshingHistory,
  };
}
