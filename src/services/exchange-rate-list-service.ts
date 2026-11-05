import type { SQLiteDatabase } from 'expo-sqlite';

import { fetchHistoricalRates } from '@/api/api-historical-exchange-rate';
import { CURRENCY_CODES } from '@/constants/currencies';
import type { RateListData, RateListRow } from '@/models/exchange-rate-list';
import { isRateDate } from '@/models/historical-exchange-rate';
import {
  getExchangeRateSnapshot,
} from '@/repositories/exchange-rate-repository';
import {
  getHistoricalRates,
  saveHistoricalRates,
} from '@/repositories/historical-exchange-rate-repository';
import { downloadExchangeRates, ensureDailyExchangeRates } from '@/services/exchange-rate-service';
import { needsHistoricalRefresh } from '@/services/historical-exchange-rate-service';

const HISTORY_CURRENCIES = CURRENCY_CODES.filter((code) => code !== 'EUR');

export async function readRateList(
  database: SQLiteDatabase,
  date: string | null,
): Promise<RateListData> {
  if (date !== null) {
    if (!isRateDate(date)) {
      throw new Error('Invalid exchange rate date');
    }
    return {
      baseCurrency: 'EUR',
      quotes: await getHistoricalRates(database, [date]),
    };
  }

  const snapshot = await getExchangeRateSnapshot(database);
  return {
    baseCurrency: snapshot?.baseCurrency ?? 'EUR',
    quotes: snapshot?.rates.map((quote) => ({
      ...quote,
      fetchedAt: snapshot.fetchedAt,
    })) ?? [],
  };
}

export async function updateRateList(
  database: SQLiteDatabase,
  date: string | null,
  force = false,
): Promise<RateListData> {
  if (date === null) {
    if (force) {
      await downloadExchangeRates(database);
    } else {
      await ensureDailyExchangeRates(database);
    }
  } else {
    if (!isRateDate(date)) {
      throw new Error('Invalid exchange rate date');
    }
    const cached = await getHistoricalRates(database, [date]);
    const byCurrency = new Map(cached.map((quote) => [quote.currencyCode, quote]));
    if (force || HISTORY_CURRENCIES.some((code) =>
      needsHistoricalRefresh(byCurrency.get(code), date),
    )) {
      // One request for the selected date and all supported currencies.
      const response = await fetchHistoricalRates(date, HISTORY_CURRENCIES);
      await saveHistoricalRates(database, response, new Date().toISOString());
    }
  }
  return readRateList(database, date);
}

export function buildRateListRows(
  data: RateListData,
  baseCurrency: string,
): RateListRow[] {
  const findQuote = (code: string) => data.quotes.find((quote) =>
    quote.currencyCode === code && Number.isFinite(quote.rate) && quote.rate > 0,
  );
  const source = findQuote(baseCurrency);
  const sourceRate = baseCurrency === data.baseCurrency ? 1 : source?.rate;

  return CURRENCY_CODES.filter((code) => code !== baseCurrency).map((code) => {
    const target = findQuote(code);
    const targetRate = code === data.baseCurrency ? 1 : target?.rate;
    const rate = sourceRate !== undefined && targetRate !== undefined
      ? targetRate / sourceRate
      : null;
    const fetchedTimes = [source?.fetchedAt, target?.fetchedAt]
      .filter((value): value is string => value !== undefined)
      .sort((a, b) => Date.parse(a) - Date.parse(b));

    return {
      currencyCode: code,
      rate: rate !== null && Number.isFinite(rate) && rate > 0 ? rate : null,
      sourceDate: baseCurrency === data.baseCurrency ? null : source?.rateDate ?? null,
      targetDate: code === data.baseCurrency ? null : target?.rateDate ?? null,
      fetchedAt: fetchedTimes[0] ?? null,
    };
  });
}
