import type { SQLiteDatabase } from 'expo-sqlite';

import {
    parseHistoricalRates,
    type CachedHistoricalRate,
    type HistoricalRateResponse,
} from '@/models/historical-exchange-rate';

export async function getHistoricalRates(
  database: SQLiteDatabase,
  dates: readonly string[],
): Promise<CachedHistoricalRate[]> {
  const unique = [...new Set(dates)];
  const result: CachedHistoricalRate[] = [];

  for (let offset = 0; offset < unique.length; offset += 300) {
    const batch = unique.slice(offset, offset + 300);
    const rows = await database.getAllAsync<CachedHistoricalRate>(
      `
        SELECT requested_date AS requestedDate,
               currency_code AS currencyCode, rate,
               rate_date AS rateDate, fetched_at AS fetchedAt,
               checked_at AS checkedAt
        FROM historical_exchange_rate
        WHERE requested_date IN (${batch.map(() => '?').join(',')})
      `,
      ...batch,
    );
    result.push(...rows);
  }
  return result;
}

async function writeHistoricalRates(
  database: SQLiteDatabase,
  response: HistoricalRateResponse,
  checkedAt: string,
): Promise<void> {
  const validated = parseHistoricalRates(
    response,
    response.requestedDate,
    response.rates.map((quote) => quote.currencyCode),
  );
  if (!Number.isFinite(Date.parse(checkedAt))) {
    throw new Error('Invalid historical rate check time');
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    for (const quote of validated.rates) {
      if (quote.currencyCode === 'EUR') {
        continue;
      }
      const existing = await transaction.getFirstAsync<{ fetchedAt: string }>(
        `SELECT fetched_at AS fetchedAt FROM historical_exchange_rate
         WHERE requested_date = ? AND currency_code = ?`,
        validated.requestedDate,
        quote.currencyCode,
      );
      if (existing && Date.parse(existing.fetchedAt) > Date.parse(quote.fetchedAt)) {
        continue;
      }
      await transaction.runAsync(
        `
          INSERT INTO historical_exchange_rate (
            requested_date, currency_code, rate,
            rate_date, fetched_at, checked_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(requested_date, currency_code) DO UPDATE SET
            rate = excluded.rate, rate_date = excluded.rate_date,
            fetched_at = excluded.fetched_at, checked_at = excluded.checked_at
        `,
        validated.requestedDate,
        quote.currencyCode,
        quote.rate,
        quote.rateDate,
        quote.fetchedAt,
        checkedAt,
      );
    }
  });
}


const writes = new WeakMap<SQLiteDatabase, Promise<void>>();

export async function saveHistoricalRates(
  database: SQLiteDatabase,
  response: HistoricalRateResponse,
  checkedAt: string,
): Promise<void> {
  const previous = writes.get(database) ?? Promise.resolve();
  const task = previous.catch(() => undefined).then(() =>
    writeHistoricalRates(database, response, checkedAt),
  );
  writes.set(database, task);
  try {
    await task;
  } finally {
    if (writes.get(database) === task) {
      writes.delete(database);
    }
  }
}
