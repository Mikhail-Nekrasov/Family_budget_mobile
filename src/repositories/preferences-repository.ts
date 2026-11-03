import type { SQLiteDatabase } from 'expo-sqlite';

import {
    isCurrencyCode,
    type CurrencyCode,
} from '@/constants/currencies';

export async function getPrimaryCurrency(
  database: SQLiteDatabase,
): Promise<CurrencyCode> {
  const result = await database.getFirstAsync<{
    currencyCode: string;
  }>(`
    SELECT primary_currency_code AS currencyCode
    FROM app_preferences
    WHERE id = 1
  `);

  if (!result || !isCurrencyCode(result.currencyCode)) {
    throw new Error('Primary currency is missing or invalid');
  }

  return result.currencyCode;
}

export async function setPrimaryCurrency(
  database: SQLiteDatabase,
  currencyCode: CurrencyCode,
): Promise<void> {
  if (!isCurrencyCode(currencyCode)) {
    throw new Error('Unsupported primary currency');
  }

  const result = await database.runAsync(
    `
      UPDATE app_preferences
      SET primary_currency_code = ?
      WHERE id = 1
    `,
    currencyCode,
  );

  if (result.changes !== 1) {
    throw new Error('Primary currency could not be saved');
  }
}