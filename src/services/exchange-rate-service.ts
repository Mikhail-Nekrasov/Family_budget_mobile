import type { SQLiteDatabase } from 'expo-sqlite';

import { fetchExchangeRateSnapshot } from '@/api/api-exchange-rate';
import type { ExchangeRateSnapshot } from '@/models/exchange-rate-snapshot';
import {
  getExchangeRateCache,
  getExchangeRateSnapshot,
  saveExchangeRateSnapshot,
} from '@/repositories/exchange-rate-repository';

const RETRY_DELAY_MS = 5 * 60 * 1000;
const downloads = new WeakMap<SQLiteDatabase, Promise<ExchangeRateSnapshot>>();
const dailyChecks = new WeakMap<SQLiteDatabase, Promise<ExchangeRateSnapshot | null>>();
const nextAttempt = new WeakMap<SQLiteDatabase, number>();

function localDay(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

// Explicit Refresh may call this even when today's automatic check already succeeded.
// Concurrent callers share one HTTP request and one cache write.
export async function downloadExchangeRates(
  database: SQLiteDatabase,
): Promise<ExchangeRateSnapshot> {
  const pending = downloads.get(database);
  if (pending) {
    return pending;
  }
  const task = (async () => {
    try {
      const snapshot = await fetchExchangeRateSnapshot();
      await saveExchangeRateSnapshot(database, snapshot);
      nextAttempt.delete(database);
      return snapshot;
    } catch (error) {
      nextAttempt.set(database, Date.now() + RETRY_DELAY_MS);
      throw error;
    }
  })();
  downloads.set(database, task);
  try {
    return await task;
  } finally {
    if (downloads.get(database) === task) {
      downloads.delete(database);
    }
  }
}

export async function ensureDailyExchangeRates(
  database: SQLiteDatabase,
): Promise<ExchangeRateSnapshot | null> {
  const pending = dailyChecks.get(database);
  if (pending) {
    return pending;
  }
  const task = (async () => {
    const cached = await getExchangeRateCache(database);
    const now = new Date();
    const checked = cached?.checkedAt ? new Date(cached.checkedAt) : null;
    if (checked && Number.isFinite(checked.getTime()) && checked <= now &&
        localDay(checked) === localDay(now)) {
      return cached?.snapshot ?? null;
    }
    if (Date.now() < (nextAttempt.get(database) ?? 0)) {
      return cached?.snapshot ?? null;
    }
    try {
      return await downloadExchangeRates(database);
    } catch (error) {
      console.warn('Could not check daily exchange rates; using saved rates', error);
      return (await getExchangeRateSnapshot(database)) ?? cached?.snapshot ?? null;
    }
  })();
  dailyChecks.set(database, task);
  try {
    return await task;
  } finally {
    if (dailyChecks.get(database) === task) {
      dailyChecks.delete(database);
    }
  }
}
