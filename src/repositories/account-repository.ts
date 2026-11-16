import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { isIconColor } from '@/constants/icon-colors';
import type { Account } from '@/models/account';
import { markAccountOrderChanged } from './account-order-sync-repository';
import { enqueueSyncCommand } from './sync-outbox-repository';

export type CreateAccountInput = {
  name: string;
  description: string | null;
  currencyCode: string;
  iconKey: string;
  iconColor: string | null;
  openingBalanceMinor: number;
  isHidden: Account['isHidden'];
};

export type UpdateAccountInput = Pick<
  Account,
  'name' | 'description' | 'iconKey' | 'iconColor' | 'isHidden'
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
  archived_at AS archivedAt,
  is_hidden AS isHidden
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
    isHidden: input.isHidden,
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
            balance_minor,
            is_hidden
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        account.isHidden,
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
      await enqueueSyncCommand(transaction, {
        entityType: 'ACCOUNT',
        entitySyncId: account.syncId,
        operation: 'CREATE',
        payload: {
          syncId: account.syncId,
          name: account.name,
          openingBalanceMinor: account.openingBalanceMinor,
          description: account.description,
          currencyCode: account.currencyCode,
          iconKey: account.iconKey,
        },
        expectedServerVersion: null,
      });
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

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const current = await getAccountBySyncId(transaction, syncId);
    if (!current) throw new Error('Account not found');
    const result = await transaction.runAsync(
      `UPDATE accounts SET name = ?, description = ?, icon_key = ?, icon_color = ?, is_hidden = ? WHERE sync_id = ?`,
      name, description, input.iconKey, input.iconColor?.toUpperCase() ?? null,
      input.isHidden, syncId,
    );
    if (result.changes !== 1) throw new Error('Account not found');
    if (current.serverId === null) {
      // The account has not reached the server. Keep its original CREATE
      // (including opening balance and currency) and update only editable fields.
      const pendingCreate = await transaction.getFirstAsync<{ commandId: string; payloadJson: string }>(
        `SELECT command_id AS commandId, payload_json AS payloadJson
         FROM sync_outbox
         WHERE entity_type = 'ACCOUNT' AND entity_sync_id = ? AND operation = 'CREATE'
         ORDER BY rowid LIMIT 1`,
        syncId,
      );
      if (!pendingCreate) {
        // This account existed before the sync outbox was introduced.
        // Preserve its original opening balance rather than its current balance.
        await enqueueSyncCommand(transaction, {
          entityType: 'ACCOUNT', entitySyncId: syncId, operation: 'CREATE',
          payload: {
            syncId, name, description, iconKey: input.iconKey,
            openingBalanceMinor: current.openingBalanceMinor,
            currencyCode: current.currencyCode,
          },
          expectedServerVersion: null,
        });
      } else {
      const originalPayload = JSON.parse(pendingCreate.payloadJson) as Record<string, unknown>;
      await transaction.runAsync(
        `UPDATE sync_outbox SET payload_json = ? WHERE command_id = ?`,
        JSON.stringify({
          ...originalPayload,
          name,
          description,
          iconKey: input.iconKey,
        }),
        pendingCreate.commandId,
      );
      }
    } else {
      await enqueueSyncCommand(transaction, {
        entityType: 'ACCOUNT', entitySyncId: syncId, operation: 'UPDATE',
        payload: { syncId, name, description, iconKey: input.iconKey },
        expectedServerVersion: current.serverVersion,
      });
    }
  });
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
          AND NOT EXISTS (
            SELECT 1 FROM transfers
            WHERE from_account_sync_id = accounts.sync_id
               OR to_account_sync_id = accounts.sync_id
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
            AND NOT EXISTS (
              SELECT 1 FROM transfers
              WHERE from_account_sync_id = accounts.sync_id
                 OR to_account_sync_id = accounts.sync_id
            )
        `,
        syncId,
      );

      if (result.changes !== 1) {
        throw new Error(
          'Account cannot be deleted: it has operations, is synchronized or does not exist',
        );
      }

      await transaction.runAsync(
        `
          DELETE FROM account_order
          WHERE account_sync_id = ?
        `,
        syncId,
      );

      // This account has never been synchronized, so no DELETE should be
      // sent. Remove its pending CREATE and any related queued changes.
      await transaction.runAsync(
        `DELETE FROM sync_outbox WHERE entity_type = 'ACCOUNT' AND entity_sync_id = ?`,
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
