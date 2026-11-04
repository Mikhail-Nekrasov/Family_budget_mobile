import type { SQLiteDatabase } from 'expo-sqlite';

import { fetchHistoricalRates } from '@/api/api-historical-exchange-rate';
import type { Account } from '@/models/account';
import type { Entry } from '@/models/entry';
import {
    isRateDate,
    type CachedHistoricalRate,
} from '@/models/historical-exchange-rate';
import {
    getHistoricalRates,
    saveHistoricalRates,
} from '@/repositories/historical-exchange-rate-repository';

export function getHistoricalRequests(
  entries: readonly Entry[],
  accounts: readonly Account[],
  targetCurrency: string,
): Map<string, string[]> {
  const accountMap = new Map(accounts.map((account) => [account.syncId, account]));
  const requests = new Map<string, Set<string>>();
  for (const entry of entries) {
    const account = accountMap.get(entry.accountSyncId);
    if (!account || account.currencyCode === targetCurrency) {
      continue;
    }
    // Entries contain local wall-clock dates: do not convert them to UTC.
    const date = entry.dateTime.slice(0, 10);
    if (!isRateDate(date)) {
      continue;
    }
    const currencies = requests.get(date) ?? new Set<string>();
    for (const code of [account.currencyCode, targetCurrency]) {
      if (code !== 'EUR') {
        currencies.add(code);
      }
    }
    requests.set(date, currencies);
  }
  return new Map([...requests].sort().map(([date, codes]) => [date, [...codes].sort()]));
}

let runningRequests = 0;
const requestWaiters: (() => void)[] = [];

async function withRequestSlot(task: () => Promise<void>): Promise<void> {
  if (runningRequests >= 2) {
    await new Promise<void>((resolve) => requestWaiters.push(resolve));
  } else {
    runningRequests += 1;
  }
  try {
    await task();
  } finally {
    const next = requestWaiters.shift();
    if (next) {
      next();
    } else {
      runningRequests -= 1;
    }
  }
}

const SIX_HOURS = 6 * 60 * 60 * 1000;
const pendingByDatabase = new WeakMap<SQLiteDatabase, Map<string, Promise<void>>>();

export function needsHistoricalRefresh(
  row: CachedHistoricalRate | undefined,
  date: string,
  now = new Date(),
): boolean {
  if (!row) {
    return true;
  }
  const weekAgo = new Date(now);
  weekAgo.setUTCDate(weekAgo.getUTCDate() - 7);
  if (date < weekAgo.toISOString().slice(0, 10)) {
    return false;
  }
  const checked = Date.parse(row.checkedAt);
  return !Number.isFinite(checked) ||
    checked > now.getTime() || now.getTime() - checked >= SIX_HOURS;
}

export async function refreshHistoricalRates(
  database: SQLiteDatabase,
  requests: ReadonlyMap<string, readonly string[]>,
  onUpdated: () => Promise<void>,
  isActive: () => boolean = () => true,
): Promise<void> {
  const cached = await getHistoricalRates(database, [...requests.keys()]);
  const available = new Map(cached.map((row) => [
    `${row.requestedDate}:${row.currencyCode}`, row,
  ]));
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const work = [...requests].filter(([date, codes]) =>
    date <= today && codes.some((code) => needsHistoricalRefresh(
      available.get(`${date}:${code}`), date, now,
    )),
  );
  let pending = pendingByDatabase.get(database);
  if (!pending) {
    pending = new Map();
    pendingByDatabase.set(database, pending);
  }
  const inFlight = pending;
  let index = 0;
  async function worker() {
    while (isActive()) {
      const item = work[index++];
      if (!item) {
        return;
      }
      const [date, codes] = item;
      const key = `${date}:${codes.join(',')}`;
      let task = inFlight.get(key);
      if (!task) {
        task = withRequestSlot(async () => {
          const response = await fetchHistoricalRates(date, codes);
          await saveHistoricalRates(database, response, new Date().toISOString());
        });
        inFlight.set(key, task);
      }
      try {
        await task;
        if (isActive()) {
          await onUpdated();
        }
      } catch (error) {
        console.warn(`Historical rates unavailable for ${date}`, error);
      } finally {
        if (inFlight.get(key) === task) {
          inFlight.delete(key);
        }
      }
    }
  }
  await Promise.all([worker(), worker()]);
}
