import type { SQLiteDatabase } from 'expo-sqlite';

import {
    parseExchangeRateSnapshot,
    type ExchangeRateSnapshot,
} from '@/models/exchange-rate-snapshot';

export async function getExchangeRateSnapshot(
  database: SQLiteDatabase,
): Promise<ExchangeRateSnapshot | null> {
  const row = await database.getFirstAsync<{
    payload: string;
  }>(`
    SELECT payload
    FROM exchange_rate_snapshot
    WHERE id = 1
  `);

  if (!row) {
    return null;
  }

  const parsed: unknown = JSON.parse(row.payload);

  return parseExchangeRateSnapshot(parsed);
}

export async function saveExchangeRateSnapshot(
  database: SQLiteDatabase,
  snapshot: ExchangeRateSnapshot,
): Promise<void> {
  const validated = parseExchangeRateSnapshot(snapshot);

  await database.runAsync(
    `
      INSERT INTO exchange_rate_snapshot (
        id,
        payload
      )
      VALUES (1, ?)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload
    `,
    JSON.stringify(validated),
  );
}