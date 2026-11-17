import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { TransferHistoryItem } from '@/models/transfer';
import { getAccountBySyncId } from '@/repositories/account-repository';
import { isEntryDateAllowed } from '@/utils/entry-period';
import { runBudgetMutation } from '@/database/budget-mutation';
import { enqueueSyncCommand, queueSyncDelete, queueSyncUpdate } from './sync-outbox-repository';

type TransferInput = {
  fromAccountSyncId: string;
  toAccountSyncId: string;
  amountMinor: number;
  targetAmountMinor: number | null;
  dateTime: Date;
  description: string;
};

type StoredTransfer = Pick<TransferHistoryItem,
  'fromAccountSyncId' | 'toAccountSyncId' | 'amountMinor' | 'targetAmountMinor'
>;

type TransferSyncRow = {
  syncId: string;
  serverId: number | null;
  serverVersion: number | null;
  fromAccountSyncId: string;
  toAccountSyncId: string;
  amountMinor: number;
  targetAmountMinor: number;
  sourceCurrencyCode: string;
  targetCurrencyCode: string;
  dateTime: string;
  description: string | null;
};

async function readTransferSyncRow(db: SQLiteDatabase, syncId: string): Promise<TransferSyncRow> {
  const row = await db.getFirstAsync<TransferSyncRow>(
    `SELECT sync_id AS syncId, server_id AS serverId, server_version AS serverVersion,
      from_account_sync_id AS fromAccountSyncId, to_account_sync_id AS toAccountSyncId,
      amount_minor AS amountMinor, target_amount_minor AS targetAmountMinor,
      source_currency_code AS sourceCurrencyCode, target_currency_code AS targetCurrencyCode,
      date_time AS dateTime, description
     FROM transfers WHERE sync_id = ?`,
    syncId,
  );
  if (!row) throw new Error('Transfer not found');
  return row;
}

function transferSyncPayload(row: TransferSyncRow) {
  return {
    syncId: row.syncId,
    fromAccountSyncId: row.fromAccountSyncId,
    toAccountSyncId: row.toAccountSyncId,
    amountMinor: row.amountMinor,
    targetAmountMinor: row.targetAmountMinor,
    sourceCurrencyCode: row.sourceCurrencyCode,
    targetCurrencyCode: row.targetCurrencyCode,
    dateTime: row.dateTime,
    description: row.description,
  };
}

async function readStoredTransfer(database: SQLiteDatabase, syncId: string): Promise<StoredTransfer> {
  const transfer = await database.getFirstAsync<StoredTransfer>(
    `SELECT from_account_sync_id AS fromAccountSyncId,
      to_account_sync_id AS toAccountSyncId,
      amount_minor AS amountMinor, target_amount_minor AS targetAmountMinor
      FROM transfers WHERE sync_id = ?`,
    syncId,
  );
  if (!transfer) throw new Error('Transfer not found');
  return transfer;
}

function validateInput({ fromAccountSyncId, toAccountSyncId, amountMinor, dateTime }: TransferInput) {
  if (fromAccountSyncId === toAccountSyncId || !isEntryDateAllowed(dateTime)
    || !Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
    throw new Error('Invalid transfer');
  }
}

async function prepareTransfer(
  database: SQLiteDatabase,
  input: TransferInput,
  previous?: StoredTransfer,
) {
  const from = await getAccountBySyncId(database, input.fromAccountSyncId);
  const to = await getAccountBySyncId(database, input.toAccountSyncId);

  if (!from || !to ||
    (from.archivedAt !== null && from.syncId !== previous?.fromAccountSyncId) ||
    (to.archivedAt !== null && to.syncId !== previous?.toAccountSyncId)) {
    throw new Error('New transfer accounts must be active');
  }

  const credited = from.currencyCode === to.currencyCode
    ? input.amountMinor
    : input.targetAmountMinor;
  if (credited === null || !Number.isSafeInteger(credited) || credited <= 0) {
    throw new Error('Invalid amount to credit');
  }

  return {
    fromAccountSyncId: from.syncId,
    toAccountSyncId: to.syncId,
    amountMinor: input.amountMinor,
    targetAmountMinor: credited,
    sourceCurrencyCode: from.currencyCode,
    targetCurrencyCode: to.currencyCode,
  };
}

export async function applyTransferBalanceChanges(
  database: SQLiteDatabase,
  previous: StoredTransfer | null,
  next: StoredTransfer | null,
) {
  const changes = new Map<string, bigint>();

  function add(id: string, amount: number) {
    if (!Number.isSafeInteger(amount)) throw new Error('Invalid saved transfer amount');
    changes.set(id, (changes.get(id) ?? 0n) + BigInt(amount));
  }

  if (previous) {
    add(previous.fromAccountSyncId, previous.amountMinor);
    add(previous.toAccountSyncId, -previous.targetAmountMinor);
  }
  if (next) {
    add(next.fromAccountSyncId, -next.amountMinor);
    add(next.toAccountSyncId, next.targetAmountMinor);
  }

  for (const [id, delta] of changes) {
    if (delta === 0n) continue;
    const account = await getAccountBySyncId(database, id);
    if (!account || !Number.isSafeInteger(account.balanceMinor)) {
      throw new Error('Invalid transfer account balance');
    }
    const balance = BigInt(account.balanceMinor) + delta;
    const limit = BigInt(Number.MAX_SAFE_INTEGER);
    if (balance < -limit || balance > limit) {
      throw new Error('Transfer balance exceeds the supported range');
    }

    const result = await database.runAsync(
      'UPDATE accounts SET balance_minor = ? WHERE sync_id = ?',
      Number(balance), id,
    );
    if (result.changes !== 1) throw new Error('Transfer account could not be updated');
  }
}

export async function createTransfer(database: SQLiteDatabase, input: TransferInput): Promise<void> {
  validateInput(input);

  await runBudgetMutation(database, async (transaction) => {
    const next = await prepareTransfer(transaction, input);
    const syncId = randomUUID();
    await transaction.runAsync(
      `INSERT INTO transfers (
        sync_id, from_account_sync_id, to_account_sync_id,
        amount_minor, target_amount_minor, source_currency_code, target_currency_code,
        date_time, description
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      syncId, next.fromAccountSyncId, next.toAccountSyncId,
      next.amountMinor, next.targetAmountMinor, next.sourceCurrencyCode, next.targetCurrencyCode,
      input.dateTime.toISOString(), input.description.trim() || null,
    );
    await applyTransferBalanceChanges(transaction, null, next);
    const row = await readTransferSyncRow(transaction, syncId);
    await enqueueSyncCommand(transaction, {
      entityType: 'TRANSFER', entitySyncId: syncId, operation: 'CREATE',
      payload: transferSyncPayload(row), expectedServerVersion: null,
    });
  });
}

export async function updateTransfer(
  database: SQLiteDatabase,
  syncId: string,
  input: TransferInput,
): Promise<void> {
  validateInput(input);

  await runBudgetMutation(database, async (transaction) => {
    const previous = await readTransferSyncRow(transaction, syncId);
    const next = await prepareTransfer(transaction, input, previous);
    const result = await transaction.runAsync(
      `UPDATE transfers SET
        from_account_sync_id = ?, to_account_sync_id = ?,
        amount_minor = ?, target_amount_minor = ?,
        source_currency_code = ?, target_currency_code = ?,
        date_time = ?, description = ?
      WHERE sync_id = ?`,
      next.fromAccountSyncId, next.toAccountSyncId,
      next.amountMinor, next.targetAmountMinor, next.sourceCurrencyCode, next.targetCurrencyCode,
      input.dateTime.toISOString(), input.description.trim() || null, syncId,
    );
    if (result.changes !== 1) throw new Error('Transfer could not be updated');
    await applyTransferBalanceChanges(transaction, previous, next);
    const row = await readTransferSyncRow(transaction, syncId);
    await queueSyncUpdate(transaction, {
      entityType: 'TRANSFER', entitySyncId: syncId,
      serverId: row.serverId, serverVersion: row.serverVersion,
    }, {
      ...transferSyncPayload(row),
      conflictBase: {
        version: previous.serverVersion,
        from_account_sync_id: previous.fromAccountSyncId, to_account_sync_id: previous.toAccountSyncId,
        amount_minor: previous.amountMinor, target_amount_minor: previous.targetAmountMinor,
        source_currency_code: previous.sourceCurrencyCode, target_currency_code: previous.targetCurrencyCode,
        date_time: previous.dateTime, description: previous.description,
      },
    });
  });
}

export async function deleteTransfer(database: SQLiteDatabase, syncId: string): Promise<void> {
  await runBudgetMutation(database, async (transaction) => {
    const previous = await readStoredTransfer(transaction, syncId);
    const row = await readTransferSyncRow(transaction, syncId);
    const result = await transaction.runAsync('DELETE FROM transfers WHERE sync_id = ?', syncId);
    if (result.changes !== 1) throw new Error('Transfer could not be deleted');
    await applyTransferBalanceChanges(transaction, previous, null);
    await queueSyncDelete(transaction, {
      entityType: 'TRANSFER', entitySyncId: syncId,
      serverId: row.serverId, serverVersion: row.serverVersion,
    }, { fromAccountSyncId: row.fromAccountSyncId, toAccountSyncId: row.toAccountSyncId });
  });
}

type TransferHistoryQuery = {
  from?: Date;
  to?: Date;
  accountSyncIds: readonly string[];
};

export async function getTransferHistory(
  database: SQLiteDatabase,
  { from, to, accountSyncIds }: TransferHistoryQuery,
): Promise<TransferHistoryItem[]> {
  const conditions: string[] = [];
  const parameters: string[] = [];

  if (from) {
    conditions.push('transfer.date_time >= ?');
    parameters.push(from.toISOString());
  }
  if (to) {
    conditions.push('transfer.date_time < ?');
    parameters.push(to.toISOString());
  }
  if (accountSyncIds.length) {
    const placeholders = accountSyncIds.map(() => '?').join(', ');
    conditions.push(`(transfer.from_account_sync_id IN (${placeholders})
      OR transfer.to_account_sync_id IN (${placeholders}))`);
    parameters.push(...accountSyncIds, ...accountSyncIds);
  }

  return database.getAllAsync<TransferHistoryItem>(
    `
      SELECT
        transfer.sync_id AS syncId,
        transfer.from_account_sync_id AS fromAccountSyncId,
        transfer.to_account_sync_id AS toAccountSyncId,
        source.name AS fromName,
        source.icon_key AS fromIconKey,
        source.icon_color AS fromIconColor,
        source.archived_at AS fromArchivedAt,
        target.name AS toName,
        target.icon_key AS toIconKey,
        target.icon_color AS toIconColor,
        target.archived_at AS toArchivedAt,
        transfer.amount_minor AS amountMinor,
        transfer.target_amount_minor AS targetAmountMinor,
        transfer.source_currency_code AS sourceCurrencyCode,
        transfer.target_currency_code AS targetCurrencyCode,
        transfer.date_time AS dateTime,
        transfer.description
      FROM transfers AS transfer
      JOIN accounts AS source ON source.sync_id = transfer.from_account_sync_id
      JOIN accounts AS target ON target.sync_id = transfer.to_account_sync_id
      ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
      ORDER BY transfer.date_time DESC, transfer.sync_id DESC
    `,
    ...parameters,
  );
}
