import type { Account } from '@/models/account';
import type { Entry } from '@/models/entry';
import type { ExchangeRateSnapshot } from '@/models/exchange-rate-snapshot';
import type { CachedHistoricalRate } from '@/models/historical-exchange-rate';
import {
    addMoneyRatios,
    convertAmountPrecisely,
    roundMoneyRatio,
    type ConversionRates,
    type MoneyRatio,
} from '@/services/currency-conversion-service';

export function calculateEntryTotals(
  entries: readonly Entry[],
  accounts: readonly Account[],
  targetCurrency: string,
  historical: readonly CachedHistoricalRate[],
  current: ExchangeRateSnapshot | null,
) {
  const accountMap = new Map(accounts.map((account) => [account.syncId, account]));
  const byDate = new Map<string, Map<string, CachedHistoricalRate>>();
  for (const row of historical) {
    const day = byDate.get(row.requestedDate) ?? new Map();
    day.set(row.currencyCode, row);
    byDate.set(row.requestedDate, day);
  }
  const preciseTotals = new Map<string, MoneyRatio>();
  let conversionIncomplete = false;
  let approximate = false;
  let preciseTotal: MoneyRatio = { numerator: 0n, denominator: 1n };
  const today = new Date().toISOString().slice(0, 10);

  for (const entry of entries) {
    const account = accountMap.get(entry.accountSyncId);
    if (!account) {
      conversionIncomplete = true;
      continue;
    }
    const date = entry.dateTime.slice(0, 10);
    const day = date <= today ? byDate.get(date) : undefined;
    const historicalAvailable = [account.currencyCode, targetCurrency]
      .every((code) => code === 'EUR' || day?.has(code));
    const historicalRates: ConversionRates | null = historicalAvailable
      ? { baseCurrency: 'EUR', rates: [...(day?.values() ?? [])] }
      : null;
    let amount: MoneyRatio | null;
    try {
      amount = convertAmountPrecisely(
        entry.amountMinor, account.currencyCode, targetCurrency, historicalRates,
      );
      if (amount === null) {
        amount = convertAmountPrecisely(
          entry.amountMinor, account.currencyCode, targetCurrency, current,
        );
        if (amount !== null) {
          approximate = true;
        }
      }
    } catch {
      conversionIncomplete = true;
      continue;
    }
    if (amount === null) {
      conversionIncomplete = true;
      continue;
    }
    if (amount.numerator < 0n) {
      conversionIncomplete = true;
      continue;
    }
    const previous = preciseTotals.get(entry.categorySyncId) ??
      { numerator: 0n, denominator: 1n };
    preciseTotals.set(entry.categorySyncId, addMoneyRatios(previous, amount));
    preciseTotal = addMoneyRatios(preciseTotal, amount);
  }

  const roundedTotal = roundMoneyRatio(preciseTotal);
  if (roundedTotal > BigInt(Number.MAX_SAFE_INTEGER)) {
    return {
      categoryTotals: new Map<string, number>(),
      conversionIncomplete: true,
      approximate,
      totalMinor: 0,
    };
  }

  // Allocate rounding remainders so chart sectors sum to the rounded total.
  const allocations = [...preciseTotals].map(([id, amount]) => ({
    id,
    floor: amount.numerator / amount.denominator,
    remainder: amount.numerator % amount.denominator,
    denominator: amount.denominator,
  }));
  let remainder = roundedTotal - allocations.reduce((sum, row) => sum + row.floor, 0n);
  allocations.sort((a, b) => {
    const difference = a.remainder * b.denominator - b.remainder * a.denominator;
    return difference > 0n ? -1 : difference < 0n ? 1 : a.id.localeCompare(b.id);
  });
  const categoryTotals = new Map<string, number>();
  for (const row of allocations) {
    const extra = remainder > 0n ? 1n : 0n;
    categoryTotals.set(row.id, Number(row.floor + extra));
    remainder -= extra;
  }
  const totalMinor = Number(roundedTotal);
  return { categoryTotals, conversionIncomplete, approximate, totalMinor };
}
