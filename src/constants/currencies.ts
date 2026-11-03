export const CURRENCY_CODES = [
  'EUR',
  'USD',
  'RUB',
  'GBP',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'MXN',
  'VND',
  'TRY',
  'JPY',
] as const;

export type CurrencyCode = typeof CURRENCY_CODES[number];

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  EUR: '€',
  USD: '$',
  RUB: '₽',
  GBP: '£',
  CHF: 'Fr.',
  SEK: 'kr',
  NOK: 'kr',
  DKK: 'kr',
  PLN: 'zł',
  CZK: 'Kč',
  MXN: '$',
  VND: '₫',
  TRY: '₺',
  JPY: '¥',
};

export function isCurrencyCode(
  value: string,
): value is CurrencyCode {
  return CURRENCY_CODES.some((code) => code === value);
}