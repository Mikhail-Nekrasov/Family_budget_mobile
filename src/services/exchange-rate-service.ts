import type { SQLiteDatabase } from 'expo-sqlite';

import { fetchExchangeRateSnapshot } from '@/api/api-exchange-rate';
import type { ExchangeRateSnapshot } from '@/models/exchange-rate-snapshot';
import {
    getExchangeRateSnapshot,
    saveExchangeRateSnapshot,
} from '@/repositories/exchange-rate-repository';

export async function refreshExchangeRates(
  database: SQLiteDatabase,
): Promise<ExchangeRateSnapshot | null> {
  try {
    const snapshot = await fetchExchangeRateSnapshot();

    await saveExchangeRateSnapshot(database, snapshot);

    return snapshot;
  } catch (error) {
    console.warn(
      'Could not refresh exchange rates; using local cache',
      error,
    );

    return getExchangeRateSnapshot(database);
  }
}