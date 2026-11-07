import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { isIconColor } from '@/constants/icon-colors';
import type { Account } from '@/models/account';
import { markAccountOrderChanged } from './account-order-sync-repository';

export type CreateAccountInput = {
  name: string;
  description: string | null;
  currencyCode: string;
  iconKey: string;
  iconColor: string | null;
  openingBalanceMinor: number;
};

export type UpdateAccountInput = Pick<
  Account,
  'name' | 'description' | 'iconKey' | 'iconColor'
>;

const ACCOUNT_COLUMNS = `
  sync_id AS syncId,
  server_id AS serverId,
  server_version AS serverVersion,
  name,
  description,
  currency_code AS currencyCode,
  icon_key AS iconKey,
  icon_color AS iconColor,
  opening_balance_minor AS openingBalanceMinor,
  balance_minor AS balanceMinor,
  archived_at AS archivedAt
`;

export async function getAccounts(
  database: SQLiteDatabase,
): Promise<Account[]> {
  return database.getAllAsync<Account>(`
    SELECT ${ACCOUNT_COLUMNS}
    FROM accounts
    INNER JOIN account_order
      ON account_order.account_sync_id = accounts.sync_id
    WHERE archived_at IS NULL
    ORDER BY account_order.sort_order, accounts.sync_id
  `);
}

export async function getArchivedAccounts(
  database: SQLiteDatabase,
): Promise<Account[]> {
  return database.getAllAsync<Account>(`
    SELECT ${ACCOUNT_COLUMNS}
    FROM accounts
    WHERE archived_at IS NOT NULL
    ORDER BY archived_at DESC, sync_id
  `);
}

export async function getAccountBySyncId(
  database: SQLiteDatabase,
  syncId: string,
): Promise<Account | null> {
  return database.getFirstAsync<Account>(
    `
      SELECT ${ACCOUNT_COLUMNS}
      FROM accounts
      WHERE sync_id = ?
    `,
    syncId,
  );
}

export async function createAccount(
  database: SQLiteDatabase,
  input: CreateAccountInput,
): Promise<Account> {
  if (input.iconColor !== null && !isIconColor(input.iconColor)) {
    throw new Error('Invalid account icon color');
  }

  const name = input.name.trim();

  if (name.length === 0) {
    throw new Error('Account name is required');
  }

  if (!Number.isSafeInteger(input.openingBalanceMinor)) {
    throw new Error('Opening balance must be a safe integer');
  }

  const account: Account = {
    syncId: randomUUID(),
    serverId: null,
    serverVersion: null,

    name,
    description: input.description?.trim() || null,

    currencyCode: input.currencyCode,
    iconKey: input.iconKey,
    iconColor: input.iconColor?.toUpperCase() ?? null,

    openingBalanceMinor: input.openingBalanceMinor,
    balanceMinor: input.openingBalanceMinor,

    archivedAt: null,
  };

  await database.withExclusiveTransactionAsync(
    async (transaction) => {
      await transaction.runAsync(
        `
          INSERT INTO accounts (
            sync_id,
            server_id,
            server_version,
            name,
            description,
            currency_code,
            icon_key,
            icon_color,
            opening_balance_minor,
            balance_minor
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        account.syncId,
        account.serverId,
        account.serverVersion,
        account.name,
        account.description,
        account.currencyCode,
        account.iconKey,
        account.iconColor,
        account.openingBalanceMinor,
        account.balanceMinor,
      );

      await transaction.runAsync(
        `
          INSERT INTO account_order (
            account_sync_id,
            sort_order
          )
          SELECT
            ?,
            COALESCE(MAX(sort_order), -1) + 1
          FROM account_order
        `,
        account.syncId,
      );

      await markAccountOrderChanged(transaction);
    },
  );

  return account;
}

export async function updateAccount(
  database: SQLiteDatabase,
  syncId: string,
  input: UpdateAccountInput,
): Promise<void> {
  if (input.iconColor !== null && !isIconColor(input.iconColor)) {
    throw new Error('Invalid account icon color');
  }

  const name = input.name.trim();

  if (name.length === 0) {
    throw new Error('Account name is required');
  }

  const description = input.description?.trim() || null;

  const result = await database.runAsync(
    `
      UPDATE accounts
      SET
        name = ?,
        description = ?,
        icon_key = ?,
        icon_color = ?
      WHERE sync_id = ?
    `,
    name,
    description,
    input.iconKey,
    input.iconColor?.toUpperCase() ?? null,
    syncId,
  );

  if (result.changes !== 1) {
    throw new Error('Account not found');
  }
}

export async function archiveAccount(
  database: SQLiteDatabase,
  syncId: string,
): Promise<void> {
  const result = await database.runAsync(
    `
      UPDATE accounts
      SET archived_at = ?
      WHERE sync_id = ?
        AND archived_at IS NULL
    `,
    new Date().toISOString(),
    syncId,
  );

  if (result.changes !== 1) {
    throw new Error('Active account not found');
  }
}

export async function restoreAccount(
  database: SQLiteDatabase,
  syncId: string,
): Promise<void> {
  const result = await database.runAsync(
    `
      UPDATE accounts
      SET archived_at = NULL
      WHERE sync_id = ?
        AND archived_at IS NOT NULL
    `,
    syncId,
  );

  if (result.changes !== 1) {
    throw new Error('Archived account not found');
  }
}

export async function canDeleteLocalAccount(
  database: SQLiteDatabase,
  syncId: string,
): Promise<boolean> {
  const result = await database.getFirstAsync<{
    deletable: number;
  }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM accounts
        WHERE sync_id = ?
          AND server_id IS NULL
          AND NOT EXISTS (
            SELECT 1
            FROM entries
            WHERE account_sync_id = accounts.sync_id
          )
      ) AS deletable
    `,
    syncId,
  );

  return result?.deletable === 1;
}

export async function deleteLocalAccount(
  database: SQLiteDatabase,
  syncId: string,
): Promise<void> {
  await database.withExclusiveTransactionAsync(
    async (transaction) => {
      const result = await transaction.runAsync(
        `
          DELETE FROM accounts
          WHERE sync_id = ?
            AND server_id IS NULL
            AND NOT EXISTS (
              SELECT 1
              FROM entries
              WHERE account_sync_id = accounts.sync_id
            )
        `,
        syncId,
      );

      if (result.changes !== 1) {
        throw new Error(
          'Account cannot be deleted: it has entries, is synchronized or does not exist',
        );
      }

      await transaction.runAsync(
        `
          DELETE FROM account_order
          WHERE account_sync_id = ?
        `,
        syncId,
      );

      await markAccountOrderChanged(transaction);
    },
  );
}

export async function saveAccountOrder(
  database: SQLiteDatabase,
  accountSyncIds: readonly string[],
): Promise<void> {
  const uniqueIds = new Set(accountSyncIds);

  if (uniqueIds.size !== accountSyncIds.length) {
    throw new Error('Account order contains duplicate IDs');
  }

  await database.withExclusiveTransactionAsync(
    async (transaction) => {
      const currentAccounts = await transaction.getAllAsync<{
        syncId: string;
        sortOrder: number;
      }>(`
        SELECT
          accounts.sync_id AS syncId,
          account_order.sort_order AS sortOrder
        FROM accounts
        INNER JOIN account_order
          ON account_order.account_sync_id = accounts.sync_id
        WHERE accounts.archived_at IS NULL
        ORDER BY account_order.sort_order, accounts.sync_id
      `);

      const containsAllActiveAccounts =
        currentAccounts.length === accountSyncIds.length &&
        currentAccounts.every((account) =>
          uniqueIds.has(account.syncId),
        );

      if (!containsAllActiveAccounts) {
        throw new Error(
          'Account order must contain all active accounts',
        );
      }

      const orderChanged = currentAccounts.some(
        (account, index) =>
          account.syncId !== accountSyncIds[index],
      );

      if (!orderChanged) {
        return;
      }

      for (const [index, syncId] of accountSyncIds.entries()) {
        await transaction.runAsync(
          `
            UPDATE account_order
            SET sort_order = ?
            WHERE account_sync_id = ?
          `,
          currentAccounts[index].sortOrder,
          syncId,
        );
      }

      await markAccountOrderChanged(transaction);
    },
  );
}
