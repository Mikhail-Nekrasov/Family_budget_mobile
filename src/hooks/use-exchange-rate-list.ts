import { useNetworkState } from 'expo-network';
import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { startupPreloadEnabled } from '@/components/startup-layout';
import type { RateListData } from '@/models/exchange-rate-list';
import {
    readRateList,
    updateRateList,
} from '@/services/exchange-rate-list-service';

type LoadState = {
  date: string | null;
  data: RateListData;
  loading: boolean;
  failed: boolean;
};

const EMPTY_DATA: RateListData = { baseCurrency: 'EUR', quotes: [] };

export function useExchangeRateList(date: string | null) {
  const database = useSQLiteContext();
  const network = useNetworkState();
  const online = network.isConnected === true && network.isInternetReachable !== false;
  const [appState, setAppState] = useState(AppState.currentState);
  const handledRefresh = useRef(0);
  const hasFocused = useRef(false);
  const [localReady, setLocalReady] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [state, setState] = useState<LoadState>({
    date,
    data: EMPTY_DATA,
    loading: true,
    failed: false,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useFocusEffect(useCallback(() => {
    hasFocused.current = true;
    let active = true;
    async function load() {
      setState((current) => ({
        date,
        data: current.date === date ? current.data : EMPTY_DATA,
        loading: true,
        failed: false,
      }));
      try {
        const cached = await readRateList(database, date).finally(() => {
          if (active) setLocalReady(true);
        });
        if (!active) {
          return;
        }
        setState({ date, data: cached, loading: true, failed: false });
        if (online && appState === 'active') {
          const force = refreshToken > handledRefresh.current;
          handledRefresh.current = refreshToken;
          const updated = await updateRateList(database, date, force);
          if (active) {
            setState({ date, data: updated, loading: false, failed: false });
          }
        }
      } catch (error) {
        console.warn('Failed to load exchange rate list', error);
        if (active) {
          setState((current) => ({ ...current, failed: true }));
        }
      } finally {
        if (active) {
          setState((current) => ({ ...current, loading: false }));
        }
      }
    }
    void load();
    return () => { active = false; };
  }, [database, date, online, appState, refreshToken]));

  useEffect(() => {
    if (!startupPreloadEnabled || date !== null || hasFocused.current) return;

    let active = true;

    void readRateList(database, null).then((cached) => {
      if (!active || hasFocused.current) return;
      setState({ date: null, data: cached, loading: false, failed: false });
    }).catch((error) => {
      if (!active || hasFocused.current) return;
      console.warn('Failed to preload exchange rates', error);
      setState({ date: null, data: EMPTY_DATA, loading: false, failed: true });
    }).finally(() => {
      if (active && !hasFocused.current) setLocalReady(true);
    });

    return () => { active = false; };
  }, [database, date]);

  return {
    localReady,
    data: state.date === date ? state.data : EMPTY_DATA,
    loading: state.date !== date || state.loading,
    failed: state.date === date && state.failed,
    online,
    refresh: () => {
      setRefreshToken((current) => current + 1);
    },
  };
}
