export type HistoricalRateQuote = {
  currencyCode: string;
  rate: number;
  rateDate: string;
  fetchedAt: string;
};

export type HistoricalRateResponse = {
  requestedDate: string;
  baseCurrency: string;
  provider: string;
  rates: HistoricalRateQuote[];
};

export type CachedHistoricalRate = HistoricalRateQuote & {
  requestedDate: string;
  checkedAt: string;
};

export function isRateDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseHistoricalRates(
  value: unknown,
  requestedDate: string,
  currencies: readonly string[],
): HistoricalRateResponse {
  if (
    !isRecord(value) ||
    !isRateDate(requestedDate) ||
    value.requestedDate !== requestedDate ||
    value.baseCurrency !== 'EUR' ||
    typeof value.provider !== 'string' ||
    value.provider.trim() === '' ||
    !Array.isArray(value.rates)
  ) {
    throw new Error('Invalid historical rate response');
  }

  const expected = new Set(currencies);
  const returned = new Set<string>();
  const rates: HistoricalRateQuote[] = [];

  for (const item of value.rates) {
    if (
      !isRecord(item) ||
      typeof item.currencyCode !== 'string' ||
      !expected.has(item.currencyCode) ||
      returned.has(item.currencyCode) ||
      typeof item.rate !== 'number' ||
      !Number.isFinite(item.rate) || item.rate <= 0 ||
      (item.currencyCode === 'EUR' && item.rate !== 1) ||
      !isRateDate(item.rateDate) || item.rateDate > requestedDate ||
      typeof item.fetchedAt !== 'string' ||
      !Number.isFinite(Date.parse(item.fetchedAt))
    ) {
      throw new Error('Invalid historical rate quote');
    }
    returned.add(item.currencyCode);
    rates.push({
      currencyCode: item.currencyCode,
      rate: item.rate,
      rateDate: item.rateDate,
      fetchedAt: item.fetchedAt,
    });
  }

  if (returned.size !== expected.size) {
    throw new Error('Incomplete historical rate response');
  }

  return {
    requestedDate,
    baseCurrency: 'EUR',
    provider: value.provider,
    rates,
  };
}
