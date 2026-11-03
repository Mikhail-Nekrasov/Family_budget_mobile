import type { ExchangeRateSnapshot } from '@/models/exchange-rate-snapshot';

function getFractionDigits(currencyCode: string): number {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

export function convertAmountMinor(
  amountMinor: number,
  sourceCurrency: string,
  targetCurrency: string,
  snapshot: ExchangeRateSnapshot | null,
): number | null {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error('Invalid amount for currency conversion');
  }

  if (sourceCurrency === targetCurrency) {
    return amountMinor;
  }

  if (!snapshot) {
    return null;
  }

  function getRate(currencyCode: string): number | undefined {
    if (currencyCode === snapshot!.baseCurrency) {
      return 1;
    }

    return snapshot!.rates.find(
      (quote) => quote.currencyCode === currencyCode,
    )?.rate;
  }

  const sourceRate = getRate(sourceCurrency);
  const targetRate = getRate(targetCurrency);

  if (
    sourceRate === undefined ||
    targetRate === undefined ||
    !Number.isFinite(sourceRate) ||
    !Number.isFinite(targetRate) ||
    sourceRate <= 0 ||
    targetRate <= 0
  ) {
    return null;
  }

  const sourceDigits = getFractionDigits(sourceCurrency);
  const targetDigits = getFractionDigits(targetCurrency);

  const converted =
    (amountMinor / 10 ** sourceDigits) *
    (targetRate / sourceRate) *
    10 ** targetDigits;

  const rounded = Math.round(converted);

  if (!Number.isSafeInteger(rounded)) {
    throw new Error('Converted amount is outside the supported range');
  }

  return rounded;
}