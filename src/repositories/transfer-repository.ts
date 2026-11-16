import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { TransferHistoryItem } from '@/models/transfer';
import { getAccountBySyncId } from '@/repositories/account-repository';
import { isEntryDateAllowed } from '@/utils/entry-period';
import { enqueueSyncCommand } from './sync-outbox-repository';

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

async function queueTransferChange(tx: SQLiteDatabase, row: TransferSyncRow): Promise<void> {
  if (row.serverId === null) {
    const pending = await tx.getFirstAsync<{ commandId: string }>(
      `SELECT command_id AS commandId FROM sync_outbox
       WHERE entity_type = 'TRANSFER' AND entity_sync_id = ? AND operation = 'CREATE'
       ORDER BY rowid LIMIT 1`,
      row.syncId,
    );
    if (!pending) {
      // Legacy local transfers predate the outbox. Queue their current state as CREATE.
      await enqueueSyncCommand(tx, {
        entityType: 'TRANSFER', entitySyncId: row.syncId, operation: 'CREATE',
        payload: transferSyncPayload(row), expectedServerVersion: null,
      });
      return;
    }
    await tx.runAsync(
      'UPDATE sync_outbox SET payload_json = ? WHERE command_id = ?',
      JSON.stringify(transferSyncPayload(row)),
      pending.commandId,
    );
  } else {
    await enqueueSyncCommand(tx, {
      entityType: 'TRANSFER', entitySyncId: row.syncId, operation: 'UPDATE',
      payload: transferSyncPayload(row), expectedServerVersion: row.serverVersion,
    });
  }
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

async function applyBalanceChanges(
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

  await database.withExclusiveTransactionAsync(async (transaction) => {
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
    await applyBalanceChanges(transaction, null, next);
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

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const previous = await readStoredTransfer(transaction, syncId);
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
    await applyBalanceChanges(transaction, previous, next);
    await queueTransferChange(transaction, await readTransferSyncRow(transaction, syncId));
  });
}

export async function deleteTransfer(database: SQLiteDatabase, syncId: string): Promise<void> {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const previous = await readStoredTransfer(transaction, syncId);
    const row = await readTransferSyncRow(transaction, syncId);
    const result = await transaction.runAsync('DELETE FROM transfers WHERE sync_id = ?', syncId);
    if (result.changes !== 1) throw new Error('Transfer could not be deleted');
    await applyBalanceChanges(transaction, previous, null);
    if (row.serverId === null) {
      await transaction.runAsync(
        `DELETE FROM sync_outbox WHERE entity_type = 'TRANSFER' AND entity_sync_id = ?`,
        syncId,
      );
    } else {
      await enqueueSyncCommand(transaction, {
        entityType: 'TRANSFER', entitySyncId: syncId, operation: 'DELETE',
        payload: { syncId }, expectedServerVersion: row.serverVersion,
      });
    }
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
