import {
  CURRENCY_SYMBOLS,
  isCurrencyCode,
} from '@/constants/currencies';

export function getCurrencySymbol(
  currencyCode: string,
): string {
  return isCurrencyCode(currencyCode)
    ? CURRENCY_SYMBOLS[currencyCode]
    : currencyCode;
}

export function formatMoney(
  amountMinor: number,
  currencyCode: string,
  locale: string,
): string {
  const fractionDigits = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
  }).resolvedOptions().maximumFractionDigits ?? 2;

  const formattedAmount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / 10 ** fractionDigits);

  return `${formattedAmount}\u00A0${getCurrencySymbol(currencyCode)}`;
}