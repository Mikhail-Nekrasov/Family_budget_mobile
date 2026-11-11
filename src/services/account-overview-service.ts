import type { Account } from '@/models/account';
import { convertAmountPrecisely, roundMoneyRatio, type ConversionRates } from '@/services/currency-conversion-service';

const MAX_AMOUNT = BigInt(Number.MAX_SAFE_INTEGER);

function sumBalances(amounts: readonly (number | null)[]): number | null {
  let total = 0n;
  for (const amount of amounts) {
    if (amount === null) return null;
    total += BigInt(amount);
  }
  return total < -MAX_AMOUNT || total > MAX_AMOUNT ? null : Number(total);
}

export function calculateAccountOverview(
  accounts: readonly Account[],
  currency: string,
  snapshot: ConversionRates | null,
) {
  const rows = accounts.map((account) => {
    if (account.balanceMinor === 0) return { account, amount: 0 };

    if (!Number.isSafeInteger(account.balanceMinor)) return { account, amount: null };

    const precise = convertAmountPrecisely(account.balanceMinor, account.currencyCode, currency, snapshot);
    const rounded = precise === null ? null : roundMoneyRatio(precise);
    const amount = rounded === null || rounded < -MAX_AMOUNT || rounded > MAX_AMOUNT
      ? null
      : Number(rounded);

    return { account, amount };
  });
  const visible = rows.filter(({ account }) => !account.isHidden);
  const hidden = rows.filter(({ account }) => account.isHidden);

  return {
    all: rows,
    visible,
    visibleTotal: sumBalances(visible.map(({ amount }) => amount)),
    hiddenTotal: sumBalances(hidden.map(({ amount }) => amount)),
    allTotal: sumBalances(rows.map(({ amount }) => amount)),
  };
}
