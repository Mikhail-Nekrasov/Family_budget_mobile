import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getAccountBySyncId } from '@/repositories/account-repository';
import { isEntryDateAllowed } from '@/utils/entry-period';

type CreateTransferInput = {
  fromAccountSyncId: string;
  toAccountSyncId: string;
  amountMinor: number;
  targetAmountMinor: number | null;
  dateTime: Date;
  description: string;
};

export async function createTransfer(
  database: SQLiteDatabase,
  input: CreateTransferInput,
): Promise<void> {
  const { fromAccountSyncId, toAccountSyncId, amountMinor, targetAmountMinor, dateTime } = input;

  if (fromAccountSyncId === toAccountSyncId || !isEntryDateAllowed(dateTime)
    || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Invalid transfer');
  }

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const from = await getAccountBySyncId(transaction, fromAccountSyncId);
    const to = await getAccountBySyncId(transaction, toAccountSyncId);

    if (!from || !to || from.archivedAt !== null || to.archivedAt !== null) {
      throw new Error('Transfer accounts must be active');
    }

    const credited = from.currencyCode === to.currencyCode ? amountMinor : targetAmountMinor;
    if (credited === null || !Number.isSafeInteger(credited) || credited <= 0) {
      throw new Error('Invalid amount to credit');
    }

    const debitBalance = from.balanceMinor - amountMinor;
    const creditBalance = to.balanceMinor + credited;
    if (![from.balanceMinor, to.balanceMinor, debitBalance, creditBalance].every(Number.isSafeInteger)) {
      throw new Error('Transfer balance exceeds the supported range');
    }

    await transaction.runAsync(
      `INSERT INTO transfers (
        sync_id, from_account_sync_id, to_account_sync_id,
        amount_minor, target_amount_minor, source_currency_code, target_currency_code,
        date_time, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      randomUUID(), from.syncId, to.syncId, amountMinor, credited,
      from.currencyCode, to.currencyCode, dateTime.toISOString(),
      input.description.trim() || null,
    );

    for (const [id, balance] of [[from.syncId, debitBalance], [to.syncId, creditBalance]] as const) {
      const result = await transaction.runAsync(
        'UPDATE accounts SET balance_minor = ? WHERE sync_id = ? AND archived_at IS NULL',
        balance, id,
      );
      if (result.changes !== 1) throw new Error('Transfer account could not be updated');
    }
  });
}
