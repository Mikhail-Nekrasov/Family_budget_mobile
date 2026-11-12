export function formatAmountInput(value: string): string {
  return value.replace(/^[+-]?\d+/, (integerPart) =>
    integerPart.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1\u00A0'),
  );
}

export function stripAmountGrouping(value: string): string {
  return value.replace(/\s/g, '');
}
