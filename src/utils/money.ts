export function parseAmountToMinor(
  value: string,
  fractionDigits: number,
): number | null {
  if (
    !Number.isSafeInteger(fractionDigits) ||
    fractionDigits < 0
  ) {
    return null;
  }

  const normalized = value.trim().replace(',', '.');

  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return null;
  }

  const negative = normalized.startsWith('-');

  const unsigned = negative
    ? normalized.slice(1)
    : normalized;

  const [whole, fraction = ''] = unsigned.split('.');

  if (fraction.length > fractionDigits) {
    return null;
  }

  const paddedFraction = fraction.padEnd(fractionDigits, '0');

  const amount = Number(`${whole}${paddedFraction}`);

  if (!Number.isSafeInteger(amount)) {
    return null;
  }

  return amount === 0 ? 0 : negative ? -amount : amount;
}