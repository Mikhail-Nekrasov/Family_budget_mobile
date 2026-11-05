import type { SQLiteDatabase } from 'expo-sqlite';

import {
  parseExchangeRateSnapshot,
  type ExchangeRateSnapshot,
} from '@/models/exchange-rate-snapshot';

export type ExchangeRateCache = {
  snapshot: ExchangeRateSnapshot;
  checkedAt: string | null;
};

export async function getExchangeRateCache(
  database: SQLiteDatabase,
): Promise<ExchangeRateCache | null> {
  const row = await database.getFirstAsync<{
    payload: string;
    checkedAt: string | null;
  }>(`
    SELECT payload, checked_at AS checkedAt
    FROM exchange_rate_snapshot
    WHERE id = 1
  `);
  if (!row) {
    return null;
  }
  return {
    snapshot: parseExchangeRateSnapshot(JSON.parse(row.payload)),
    checkedAt: row.checkedAt,
  };
}

export async function getExchangeRateSnapshot(
  database: SQLiteDatabase,
): Promise<ExchangeRateSnapshot | null> {
  return (await getExchangeRateCache(database))?.snapshot ?? null;
}

export async function saveExchangeRateSnapshot(
  database: SQLiteDatabase,
  snapshot: ExchangeRateSnapshot,
  checkedAt = new Date().toISOString(),
): Promise<void> {
  const validated = parseExchangeRateSnapshot(snapshot);
  if (!Number.isFinite(Date.parse(checkedAt))) {
    throw new Error('Invalid exchange rate check time');
  }
  await database.runAsync(
    `
      INSERT INTO exchange_rate_snapshot (id, payload, checked_at)
      VALUES (1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        checked_at = excluded.checked_at
    `,
    JSON.stringify(validated),
    checkedAt,
  );
}
