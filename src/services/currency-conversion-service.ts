import type { ExchangeRateSnapshot } from '@/models/exchange-rate-snapshot';

export type ConversionRates = Pick<ExchangeRateSnapshot, 'baseCurrency' | 'rates'>;

function getFractionDigits(currencyCode: string): number {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits ?? 2;
}

// Use integer arithmetic for rounding; 1.005 must not turn into 1.00.
function decimalRatio(value: number): [bigint, bigint] {
  const [mantissa, exponent = '0'] = value.toString().toLowerCase().split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  const digits = BigInt(whole + fraction);
  const scale = fraction.length - Number(exponent);
  return scale >= 0
    ? [digits, 10n ** BigInt(scale)]
    : [digits * 10n ** BigInt(-scale), 1n];
}

export function convertAmountPrecisely(
  amountMinor: number,
  sourceCurrency: string,
  targetCurrency: string,
  snapshot: ConversionRates | null,
): MoneyRatio | null {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error('Invalid amount for currency conversion');
  }
  if (sourceCurrency === targetCurrency) {
    return { numerator: BigInt(amountMinor), denominator: 1n };
  }
  if (!snapshot) {
    return null;
  }
  const getRate = (code: string) => code === snapshot.baseCurrency
    ? 1
    : snapshot.rates.find((quote) => quote.currencyCode === code)?.rate;
  const sourceRate = getRate(sourceCurrency);
  const targetRate = getRate(targetCurrency);
  if (
    sourceRate === undefined || targetRate === undefined ||
    !Number.isFinite(sourceRate) || !Number.isFinite(targetRate) ||
    sourceRate <= 0 || targetRate <= 0
  ) {
    return null;
  }

  const [sourceNumerator, sourceDenominator] = decimalRatio(sourceRate);
  const [targetNumerator, targetDenominator] = decimalRatio(targetRate);
  const numerator = BigInt(Math.abs(amountMinor)) * targetNumerator *
    sourceDenominator * 10n ** BigInt(getFractionDigits(targetCurrency));
  const denominator = sourceNumerator * targetDenominator *
    10n ** BigInt(getFractionDigits(sourceCurrency));
  return {
    numerator: numerator * (amountMinor < 0 ? -1n : 1n),
    denominator,
  };
}

export type MoneyRatio = {
  numerator: bigint;
  denominator: bigint;
};

export function roundMoneyRatio(value: MoneyRatio): bigint {
  const absolute = value.numerator < 0n ? -value.numerator : value.numerator;
  const rounded = (absolute * 2n + value.denominator) / (value.denominator * 2n);
  return value.numerator < 0n ? -rounded : rounded;
}

export function addMoneyRatios(first: MoneyRatio, second: MoneyRatio): MoneyRatio {
  const numerator = first.numerator * second.denominator +
    second.numerator * first.denominator;
  const denominator = first.denominator * second.denominator;
  let a = numerator < 0n ? -numerator : numerator;
  let b = denominator;
  while (b !== 0n) {
    [a, b] = [b, a % b];
  }
  return { numerator: numerator / a, denominator: denominator / a };
}

export function convertAmountMinor(
  amountMinor: number,
  sourceCurrency: string,
  targetCurrency: string,
  snapshot: ConversionRates | null,
): number | null {
  const precise = convertAmountPrecisely(
    amountMinor, sourceCurrency, targetCurrency, snapshot,
  );
  if (!precise) {
    return null;
  }
  const rounded = roundMoneyRatio(precise);
  if (rounded > BigInt(Number.MAX_SAFE_INTEGER) ||
      rounded < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error('Converted amount is outside the supported range');
  }
  return Number(rounded);
}
