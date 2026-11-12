export function formatAmountInput(value: string): string {
  return value.replace(/^[+-]?\d+/, (integerPart) =>
    integerPart.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1\u00A0'),
  );
}

export function stripAmountGrouping(value: string): string {
  return value.replace(/\s/g, '');
}

export function initialAmountCaret(formatted: string): number {
  const decimal = formatted.search(/[.,]/);
  return decimal === -1 ? formatted.length : decimal;
}

export function deleteAmountGrouping(formatted: string, edited: string) {
  if (edited.length !== formatted.length - 1) return null;

  let index = 0;
  while (formatted[index] === edited[index] && index < edited.length) {
    index += 1;
  }

  if (formatted[index] !== '\u00A0' ||
      formatted.slice(index + 1) !== edited.slice(index) ||
      !/\d/.test(formatted[index - 1] ?? '')) {
    return null;
  }

  // Backspace on an inserted space deletes the digit before it instead.
  const prefix = stripAmountGrouping(formatted.slice(0, index - 1));
  const amount = prefix + stripAmountGrouping(formatted.slice(index + 1));
  const next = formatAmountInput(amount);
  let caret = 0;
  let remaining = prefix.length;
  while (remaining > 0 && caret < next.length) {
    if (next[caret] !== '\u00A0') remaining -= 1;
    caret += 1;
  }

  return { amount, caret };
}
