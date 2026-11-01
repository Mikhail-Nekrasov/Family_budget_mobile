import type { SQLiteDatabase } from 'expo-sqlite';

import type { AccountOrderSyncState } from '@/models/account-order-sync-state';

export async function getAccountOrderSyncState(
  database: SQLiteDatabase,
): Promise<AccountOrderSyncState> {
  const state = await database.getFirstAsync<AccountOrderSyncState>(`
    SELECT
      server_owner_username AS serverOwnerUsername,
      server_version AS serverVersion,
      local_revision AS localRevision,
      synced_revision AS syncedRevision
    FROM account_order_sync_state
    WHERE id = 1
  `);

  if (state === null) {
    throw new Error('Account order sync state is missing');
  }

  return state;
}

export async function initializeAccountOrderServerState(
  database: SQLiteDatabase,
  ownerUsername: string,
  serverVersion: number,
): Promise<void> {
  if (ownerUsername.trim().length === 0) {
    throw new Error('Server username is required');
  }

  if (!Number.isSafeInteger(serverVersion) || serverVersion < 0) {
    throw new Error(
      'Server version must be a non-negative safe integer',
    );
  }

  await database.withExclusiveTransactionAsync(
    async (transaction) => {
      const state = await getAccountOrderSyncState(transaction);

      if (
        state.serverOwnerUsername !== null &&
        state.serverOwnerUsername !== ownerUsername
      ) {
        throw new Error(
          'Local account order belongs to another server user',
        );
      }

      if (state.serverVersion !== null) {
        if (state.serverOwnerUsername === null) {
          throw new Error(
            'Account order server state is inconsistent',
          );
        }

        return;
      }

      await transaction.runAsync(
        `
          UPDATE account_order_sync_state
          SET
            server_owner_username = ?,
            server_version = ?
          WHERE id = 1
        `,
        ownerUsername,
        serverVersion,
      );
    },
  );
}

export async function markAccountOrderChanged(
  transaction: Pick<SQLiteDatabase, 'runAsync'>,
): Promise<void> {
  const result = await transaction.runAsync(
    `
      UPDATE account_order_sync_state
      SET local_revision = local_revision + 1
      WHERE id = 1
        AND local_revision < ?
    `,
    Number.MAX_SAFE_INTEGER,
  );

  if (result.changes !== 1) {
    throw new Error(
      'Account order sync revision could not be updated',
    );
  }
}