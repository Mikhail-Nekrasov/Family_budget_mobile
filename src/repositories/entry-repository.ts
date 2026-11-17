import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Entry } from '@/models/entry';
import type { EntryType } from '@/models/entry-type';
import { mergeEntryVersions, type EntrySyncConflict } from '@/services/entry-sync-conflict';
import { getAccountBySyncId } from '@/repositories/account-repository';
import { getCategoryBySyncId } from '@/repositories/category-repository';
import { isEntryDateAllowed } from '@/utils/entry-period';
import { runBudgetMutation } from '@/database/budget-mutation';
import { enqueueSyncCommand, queueSyncDelete, queueSyncUpdate } from './sync-outbox-repository';

export type CreateEntryInput = {
  title: string;
  type: EntryType;
  amountMinor: number;
  dateTime: Date;
  description: string | null;
  accountSyncId: string;
  categorySyncId: string;
};

export type EntryQuery = {
  type: EntryType;
  from?: Date;
  to?: Date;
  accountSyncIds?: readonly string[];
  categorySyncIds?: readonly string[];
};

export type RecentEntryUsage = {
  accountSyncId: string;
  categorySyncId: string;
};

const ENTRY_COLUMNS = `
  sync_id AS syncId,
  server_id AS serverId,
  server_version AS serverVersion,
  title,
  type,
  amount_minor AS amountMinor,
  date_time AS dateTime,
  description,
  account_sync_id AS accountSyncId,
  category_sync_id AS categorySyncId
`;

function formatLocalDateTime(value: Date): string {
  if (
    !Number.isFinite(value.getTime()) ||
    value.getFullYear() < 1 ||
    value.getFullYear() > 9999
  ) {
    throw new Error('Invalid entry date');
  }

  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  const hours = String(value.getHours()).padStart(2, '0');
  const minutes = String(value.getMinutes()).padStart(2, '0');
  const seconds = String(value.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function validateType(type: EntryType): void {
  if (type !== 'EXPENSE' && type !== 'INCOME') {
    throw new Error('Invalid entry type');
  }
}


function entrySyncPayload(entry: Entry) {
  return {
    syncId: entry.syncId,
    title: entry.title,
    type: entry.type,
    amountMinor: entry.amountMinor,
    dateTime: entry.dateTime,
    description: entry.description,
    accountSyncId: entry.accountSyncId,
    categorySyncId: entry.categorySyncId,
  };
}

export async function getEntries(
  database: SQLiteDatabase,
  query: EntryQuery,
): Promise<Entry[]> {
  validateType(query.type);

  const conditions = ['type = ?'];
  const parameters: string[] = [query.type];

  const from = query.from === undefined ? undefined : formatLocalDateTime(query.from);
  const to = query.to === undefined ? undefined : formatLocalDateTime(query.to);
  if (from !== undefined && to !== undefined && from >= to) {
    throw new Error('Entry period must have a positive duration');
  }
  if (from !== undefined) {
    conditions.push('date_time >= ?');
    parameters.push(from);
  }
  if (to !== undefined) {
    conditions.push('date_time < ?');
    parameters.push(to);
  }

  if (query.accountSyncIds && query.accountSyncIds.length > 0) {
    const placeholders = query.accountSyncIds
      .map(() => '?')
      .join(',');

    conditions.push(`account_sync_id IN (${placeholders})`);
    parameters.push(...query.accountSyncIds);
  }

  if (query.categorySyncIds && query.categorySyncIds.length > 0) {
    const placeholders = query.categorySyncIds
      .map(() => '?')
      .join(',');

    conditions.push(`category_sync_id IN (${placeholders})`);
    parameters.push(...query.categorySyncIds);
  }

  return database.getAllAsync<Entry>(
    `
      SELECT ${ENTRY_COLUMNS}
      FROM entries
      WHERE ${conditions.join(' AND ')}
      ORDER BY date_time DESC, sync_id
    `,
    ...parameters,
  );
}

export async function getEntryBySyncId(
  database: SQLiteDatabase,
  syncId: string,
): Promise<Entry | null> {
  return database.getFirstAsync<Entry>(
    `
      SELECT ${ENTRY_COLUMNS}
      FROM entries
      WHERE sync_id = ?
    `,
    syncId,
  );
}

export async function createEntry(
  database: SQLiteDatabase,
  input: CreateEntryInput,
): Promise<Entry> {
  const title = input.title.trim();

  if (title.length === 0 || title.length > 255) {
    throw new Error(
      'Entry title must contain between 1 and 255 characters',
    );
  }

  validateType(input.type);

  if (
    !Number.isSafeInteger(input.amountMinor) ||
    input.amountMinor <= 0
  ) {
    throw new Error(
      'Entry amount must be a positive safe integer',
    );
  }

  if (!isEntryDateAllowed(input.dateTime)) {
    throw new Error('Entry date is outside the allowed range');
  }

  const entry: Entry = {
    syncId: randomUUID(),
    serverId: null,
    serverVersion: null,
    title,
    type: input.type,
    amountMinor: input.amountMinor,
    dateTime: formatLocalDateTime(input.dateTime),
    description: input.description?.trim() || null,
    accountSyncId: input.accountSyncId,
    categorySyncId: input.categorySyncId,
  };

  await runBudgetMutation(
    database,
    async (transaction) => {
      const account = await getAccountBySyncId(
        transaction,
        entry.accountSyncId,
      );

      if (account === null || account.archivedAt !== null) {
        throw new Error('Active account not found');
      }

      const category = await getCategoryBySyncId(
        transaction,
        entry.categorySyncId,
      );

      if (category === null || category.type !== entry.type) {
        throw new Error('Category does not match entry type');
      }

      if (!Number.isSafeInteger(account.balanceMinor)) {
        throw new Error(
          'Account balance is outside the supported range',
        );
      }

      const balanceMinor = entry.type === 'EXPENSE'
        ? account.balanceMinor - entry.amountMinor
        : account.balanceMinor + entry.amountMinor;

      if (!Number.isSafeInteger(balanceMinor)) {
        throw new Error(
          'Resulting balance is outside the supported range',
        );
      }

      await transaction.runAsync(
        `
          INSERT INTO entries (
            sync_id,
            server_id,
            server_version,
            title,
            type,
            amount_minor,
            date_time,
            description,
            account_sync_id,
            category_sync_id
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        entry.syncId,
        entry.serverId,
        entry.serverVersion,
        entry.title,
        entry.type,
        entry.amountMinor,
        entry.dateTime,
        entry.description,
        entry.accountSyncId,
        entry.categorySyncId,
      );

      const updated = await transaction.runAsync(
        `
          UPDATE accounts
          SET balance_minor = ?
          WHERE sync_id = ?
            AND archived_at IS NULL
        `,
        balanceMinor,
        entry.accountSyncId,
      );

      if (updated.changes !== 1) {
        throw new Error('Account balance could not be updated');
      }

      await enqueueSyncCommand(transaction, {
        entityType: 'ENTRY',
        entitySyncId: entry.syncId,
        operation: 'CREATE',
        payload: entrySyncPayload(entry),
        expectedServerVersion: null,
      });
    },
  );

  return entry;
}

export async function getRecentEntryUsage(
  database: SQLiteDatabase,
  type: EntryType,
): Promise<RecentEntryUsage[]> {
  validateType(type);

  return database.getAllAsync<RecentEntryUsage>(
    `
      SELECT
        account_sync_id AS accountSyncId,
        category_sync_id AS categorySyncId
      FROM entries
      WHERE type = ?
      ORDER BY rowid DESC
      LIMIT 10
    `,
    type,
  );
}

export type UpdateEntryInput = Omit<CreateEntryInput, 'type'>;

async function changeBalance(
  database: SQLiteDatabase,
  accountSyncId: string,
  delta: number,
): Promise<void> {
  const account = await getAccountBySyncId(database, accountSyncId);

  if (!account || !Number.isSafeInteger(account.balanceMinor)) {
    throw new Error('Account balance is unavailable');
  }

  const balance = account.balanceMinor + delta;

  if (!Number.isSafeInteger(balance)) {
    throw new Error('Resulting balance is outside the supported range');
  }

  const result = await database.runAsync(
    'UPDATE accounts SET balance_minor = ? WHERE sync_id = ?',
    balance,
    accountSyncId,
  );

  if (result.changes !== 1) {
    throw new Error('Account balance could not be updated');
  }
}

export async function updateEntry(
  database: SQLiteDatabase,
  syncId: string,
  input: UpdateEntryInput,
): Promise<void> {
  const title = input.title.trim();

  if (title.length === 0 || title.length > 255) {
    throw new Error('Invalid entry title');
  }

  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error('Invalid entry amount');
  }

  if (!isEntryDateAllowed(input.dateTime)) {
    throw new Error('Entry date is outside the allowed range');
  }

  const dateTime = formatLocalDateTime(input.dateTime);

  await runBudgetMutation(database, async (transaction) => {
    const previous = await getEntryBySyncId(transaction, syncId);

    if (!previous) {
      throw new Error('Entry not found');
    }

    const targetAccount = await getAccountBySyncId(
      transaction,
      input.accountSyncId,
    );

    if (
      !targetAccount ||
      (targetAccount.archivedAt !== null &&
        targetAccount.syncId !== previous.accountSyncId)
    ) {
      throw new Error('Target account is unavailable');
    }

    const category = await getCategoryBySyncId(
      transaction,
      input.categorySyncId,
    );

    if (!category || category.type !== previous.type) {
      throw new Error('Category does not match entry type');
    }

    const direction = previous.type === 'EXPENSE' ? -1 : 1;

    if (previous.accountSyncId === input.accountSyncId) {
      await changeBalance(
        transaction,
        previous.accountSyncId,
        direction * (input.amountMinor - previous.amountMinor),
      );
    } else {
      await changeBalance(
        transaction,
        previous.accountSyncId,
        -direction * previous.amountMinor,
      );
      await changeBalance(
        transaction,
        input.accountSyncId,
        direction * input.amountMinor,
      );
    }

    const result = await transaction.runAsync(
      `
        UPDATE entries
        SET title = ?, amount_minor = ?, date_time = ?,
            description = ?, account_sync_id = ?, category_sync_id = ?
        WHERE sync_id = ?
      `,
      title,
      input.amountMinor,
      dateTime,
      input.description?.trim() || null,
      input.accountSyncId,
      input.categorySyncId,
      syncId,
    );

    if (result.changes !== 1) {
      throw new Error('Entry could not be updated');
    }

    await queueSyncUpdate(transaction, {
      entityType: 'ENTRY', entitySyncId: syncId,
      serverId: previous.serverId, serverVersion: previous.serverVersion,
    }, {
      conflictBase: { ...entrySyncPayload(previous), version: previous.serverVersion },
      ...entrySyncPayload({
        ...previous,
        title,
        amountMinor: input.amountMinor,
        dateTime,
        description: input.description?.trim() || null,
        accountSyncId: input.accountSyncId,
        categorySyncId: input.categorySyncId,
      }),
    });
  });
}

export async function deleteEntry(
  database: SQLiteDatabase,
  syncId: string,
): Promise<void> {
  await runBudgetMutation(database, async (transaction) => {
    const entry = await getEntryBySyncId(transaction, syncId);

    if (!entry) {
      throw new Error('Entry not found');
    }

    await changeBalance(
      transaction,
      entry.accountSyncId,
      entry.type === 'EXPENSE' ? entry.amountMinor : -entry.amountMinor,
    );

    const result = await transaction.runAsync(
      'DELETE FROM entries WHERE sync_id = ?',
      syncId,
    );

    if (result.changes !== 1) {
      throw new Error('Entry could not be deleted');
    }

    await queueSyncDelete(transaction, {
      entityType: 'ENTRY', entitySyncId: syncId,
      serverId: entry.serverId, serverVersion: entry.serverVersion,
    }, { accountSyncId: entry.accountSyncId, categorySyncId: entry.categorySyncId });
  });
}


export class EntryConflictChangedError extends Error {}

export async function resolveEntrySyncConflict(
  database: SQLiteDatabase,
  conflict: EntrySyncConflict,
  choice: 'server' | 'local',
): Promise<void> {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const { syncId, commandId, expectedVersion, server, local } = conflict;
    const queued = await transaction.getAllAsync<{ id: string; operation: string; version: number; attempts: number }>(
      `SELECT command_id AS id, operation, expected_server_version AS version, attempts
       FROM sync_outbox WHERE entity_type = 'ENTRY' AND entity_sync_id = ? ORDER BY rowid`, syncId,
    );
    const [head, ...later] = queued;
    const entry = await getEntryBySyncId(transaction, syncId);
    if (!head || head.id !== commandId || head.version !== expectedVersion
        || later.some((command) => command.attempts !== 0)) {
      throw new Error('The entry has other operations that require reconciliation');
    }
    if (!server) {
      if (head.operation !== 'UPDATE' || later.some((command, index) =>
        command.operation !== 'UPDATE' && !(index === later.length - 1 && command.operation === 'DELETE'))) {
        throw new Error('The entry has other operations that require reconciliation');
      }
      if (Boolean(entry) === Boolean(conflict.localDeleted)
          || (entry && (entry.title !== local.title || entry.type !== local.type || entry.amountMinor !== local.amountMinor
            || entry.dateTime.slice(0, 19) !== local.dateTime || (entry.description || null) !== local.description
            || entry.accountSyncId !== local.accountSyncId || entry.categorySyncId !== local.categorySyncId))) {
        throw new EntryConflictChangedError('The local entry changed after the comparison was shown');
      }
      await transaction.runAsync(
        "DELETE FROM sync_outbox WHERE entity_type = 'ENTRY' AND entity_sync_id = ?", syncId,
      );
      if (choice === 'local') {
        if (!entry || entry.serverVersion !== expectedVersion) throw new Error('The entry cannot be recreated');
        const replacementId = randomUUID();
        await transaction.runAsync(
          'UPDATE entries SET sync_id = ?, server_id = NULL, server_version = NULL WHERE sync_id = ?',
          replacementId, syncId,
        );
        await enqueueSyncCommand(transaction, {
          entityType: 'ENTRY', entitySyncId: replacementId, operation: 'CREATE',
          payload: entrySyncPayload({ ...entry, syncId: replacementId }), expectedServerVersion: null,
        });
      } else if (entry) {
        const direction = entry.type === 'EXPENSE' ? 1 : -1;
        await changeBalance(transaction, entry.accountSyncId, direction * entry.amountMinor);
        await transaction.runAsync('DELETE FROM entries WHERE sync_id = ?', syncId);
      }
      return;
    }

    const lastOperation = queued.at(-1)?.operation;
    if (lastOperation === 'DELETE' && !entry) {
      if (!conflict.localDeleted) throw new EntryConflictChangedError('The entry was deleted during comparison');
      if (queued.slice(0, -1).some((command) => command.operation !== 'UPDATE')) {
        throw new Error('The entry has other operations that require reconciliation');
      }

      await transaction.runAsync(
        `DELETE FROM sync_outbox WHERE entity_type = 'ENTRY' AND entity_sync_id = ? AND command_id <> ?`,
        syncId, commandId,
      );
      if (choice === 'local') {
        // The local deletion already adjusted the balance. Send only the deletion.
        await transaction.runAsync(
          `UPDATE sync_outbox SET command_id = ?, operation = 'DELETE', payload_json = ?,
             expected_server_version = ?, attempts = 0, request_json = NULL, conflict_json = NULL WHERE command_id = ?`,
          randomUUID(), JSON.stringify({ syncId }), server.version, commandId,
        );
      } else {
        const account = await getAccountBySyncId(transaction, server.accountSyncId);
        const category = await getCategoryBySyncId(transaction, server.categorySyncId);
        if (server.id === null || !account || account.currencyCode !== server.currencyCode
            || category?.type !== server.type) {
          throw new Error('The server entry, account or category is unavailable locally');
        }
        await transaction.runAsync(
          `INSERT INTO entries (sync_id, server_id, server_version, title, type, amount_minor,
             date_time, description, account_sync_id, category_sync_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          syncId, server.id, server.version, server.title, server.type, server.amountMinor,
          server.dateTime, server.description, server.accountSyncId, server.categorySyncId,
        );
        await changeBalance(transaction, server.accountSyncId,
          server.type === 'EXPENSE' ? -server.amountMinor : server.amountMinor);
        await transaction.runAsync('DELETE FROM sync_outbox WHERE command_id = ?', commandId);
      }
      return;
    }

    if (head.operation !== 'UPDATE' || entry?.serverVersion !== expectedVersion
        || later.some((command) => command.operation !== 'UPDATE')) {
      throw new Error('The entry has other operations that require reconciliation');
    }
    if (entry.title !== local.title || entry.type !== local.type || entry.amountMinor !== local.amountMinor
        || entry.dateTime.slice(0, 19) !== local.dateTime || (entry.description || null) !== local.description
        || entry.accountSyncId !== local.accountSyncId || entry.categorySyncId !== local.categorySyncId) {
      throw new EntryConflictChangedError('The local entry changed after the comparison was shown');
    }

    await transaction.runAsync(
      `DELETE FROM sync_outbox WHERE entity_type = 'ENTRY' AND entity_sync_id = ? AND command_id <> ?`,
      syncId, commandId,
    );

    const merge = mergeEntryVersions(conflict, choice);
    const next = merge?.merged ?? (choice === 'local' ? local : server);
    const needsUpload = merge?.needsUpload ?? choice === 'local';

    const account = await getAccountBySyncId(transaction, next.accountSyncId);
    const category = await getCategoryBySyncId(transaction, next.categorySyncId);
    if (!account || (next.currencyCode && account.currencyCode !== next.currencyCode) || category?.type !== next.type) {
      throw new Error('The chosen account or category is unavailable locally');
    }
    if (needsUpload && account.archivedAt !== null && next.accountSyncId !== server.accountSyncId) {
      throw new Error('A new entry account must be active');
    }
    const direction = entry.type === 'EXPENSE' ? -1 : 1;
    if (entry.accountSyncId === next.accountSyncId) {
      await changeBalance(transaction, entry.accountSyncId, direction * (next.amountMinor - entry.amountMinor));
    } else {
      await changeBalance(transaction, entry.accountSyncId, -direction * entry.amountMinor);
      await changeBalance(transaction, next.accountSyncId, direction * next.amountMinor);
    }
    await transaction.runAsync(
      `UPDATE entries SET title = ?, amount_minor = ?, date_time = ?, description = ?,
         account_sync_id = ?, category_sync_id = ?, server_version = ? WHERE sync_id = ?`,
      next.title, next.amountMinor, next.dateTime, next.description,
      next.accountSyncId, next.categorySyncId, server.version, syncId,
    );
    if (needsUpload) {
      await transaction.runAsync(
        `UPDATE sync_outbox SET command_id = ?, payload_json = ?, expected_server_version = ?,
           attempts = 0, request_json = NULL, conflict_json = NULL WHERE command_id = ?`,
        randomUUID(), JSON.stringify({ ...entrySyncPayload({ ...entry, ...next }), conflictBase: server }),
        server.version, commandId,
      );
      return;
    }
    await transaction.runAsync('DELETE FROM sync_outbox WHERE command_id = ?', commandId);
  });
}
