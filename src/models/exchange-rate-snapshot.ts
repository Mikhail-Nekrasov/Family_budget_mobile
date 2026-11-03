export type ExchangeRateQuote = {
  currencyCode: string;
  rate: number;
  rateDate: string;
};

export type ExchangeRateSnapshot = {
  baseCurrency: string;
  provider: string;
  fetchedAt: string;
  rates: ExchangeRateQuote[];
};

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCurrencyCode(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Z]{3}$/.test(value);
}

function isQuote(value: unknown): value is ExchangeRateQuote {
  return (
    isRecord(value) &&
    isCurrencyCode(value.currencyCode) &&
    typeof value.rate === 'number' &&
    Number.isFinite(value.rate) &&
    value.rate > 0 &&
    typeof value.rateDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.rateDate) &&
    Number.isFinite(Date.parse(value.rateDate))
  );
}

export function parseExchangeRateSnapshot(
  value: unknown,
): ExchangeRateSnapshot {
  if (
    !isRecord(value) ||
    !isCurrencyCode(value.baseCurrency) ||
    typeof value.provider !== 'string' ||
    value.provider.trim().length === 0 ||
    typeof value.fetchedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.fetchedAt)) ||
    !Array.isArray(value.rates) ||
    value.rates.length === 0 ||
    !value.rates.every(isQuote)
  ) {
    throw new Error('Invalid exchange rate snapshot');
  }

  const rates: ExchangeRateQuote[] = value.rates;

  const uniqueCurrencies = new Set(
    rates.map((quote) => quote.currencyCode),
  );

  if (uniqueCurrencies.size !== rates.length) {
    throw new Error('Duplicate exchange rate currencies');
  }

  return {
    baseCurrency: value.baseCurrency,
    provider: value.provider,
    fetchedAt: value.fetchedAt,
    rates,
  };
}