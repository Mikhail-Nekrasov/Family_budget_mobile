import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Entry } from '@/models/entry';
import type { EntryType } from '@/models/entry-type';
import { getAccountBySyncId } from '@/repositories/account-repository';
import { getCategoryBySyncId } from '@/repositories/category-repository';
import { isEntryDateAllowed } from '@/utils/entry-period';

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

  await database.withExclusiveTransactionAsync(
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

  await database.withExclusiveTransactionAsync(async (transaction) => {
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
  });
}

export async function deleteEntry(
  database: SQLiteDatabase,
  syncId: string,
): Promise<void> {
  await database.withExclusiveTransactionAsync(async (transaction) => {
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
  });
}
