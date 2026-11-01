import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { AccountOrderServerResponse } from '@/models/account-order-server-response';
import type { AccountOrderSyncCommand } from '@/models/account-order-sync-command';
import { getAccountOrderSyncState } from '@/repositories/account-order-sync-repository';

export async function getPendingAccountOrderCommand(
  database: SQLiteDatabase,
): Promise<AccountOrderSyncCommand | null> {
  return database.getFirstAsync<AccountOrderSyncCommand>(`
    SELECT
      command_id AS commandId,
      owner_username AS ownerUsername,
      local_revision AS localRevision,
      expected_version AS expectedVersion,
      request_body AS requestBody
    FROM pending_account_order_command
    WHERE id = 1
  `);
}

export async function prepareAccountOrderCommand(
  database: SQLiteDatabase,
  ownerUsername: string,
): Promise<AccountOrderSyncCommand | null> {
  if (ownerUsername.trim().length === 0) {
    throw new Error('Server username is required');
  }

  let prepared: AccountOrderSyncCommand | null = null;

  await database.withExclusiveTransactionAsync(
    async (transaction) => {
      const existing = await getPendingAccountOrderCommand(
        transaction,
      );

      if (existing !== null) {
        if (existing.ownerUsername !== ownerUsername) {
          throw new Error(
            'Pending command belongs to another server user',
          );
        }

        prepared = existing;
        return;
      }

      const state = await getAccountOrderSyncState(transaction);

      if (state.serverVersion === null) {
        return;
      }

      if (state.serverOwnerUsername !== ownerUsername) {
        throw new Error(
          'Local account order belongs to another server user',
        );
      }

      if (state.localRevision === state.syncedRevision) {
        return;
      }

      if (
        !Number.isSafeInteger(state.serverVersion) ||
        state.serverVersion < 0 ||
        state.serverVersion >= Number.MAX_SAFE_INTEGER
      ) {
        throw new Error(
          'Server version is outside the supported range',
        );
      }

      const accounts = await transaction.getAllAsync<{
        syncId: string;
        serverId: number | null;
        sortOrder: number | null;
      }>(`
        SELECT
          accounts.sync_id AS syncId,
          accounts.server_id AS serverId,
          account_order.sort_order AS sortOrder
        FROM accounts
        LEFT JOIN account_order
          ON account_order.account_sync_id = accounts.sync_id
        ORDER BY account_order.sort_order, accounts.sync_id
      `);

      if (accounts.some((account) => account.sortOrder === null)) {
        throw new Error('Local account order is incomplete');
      }

      if (accounts.some((account) => account.serverId === null)) {
        return;
      }

      prepared = {
        commandId: randomUUID(),
        ownerUsername,
        localRevision: state.localRevision,
        expectedVersion: state.serverVersion,
        requestBody: JSON.stringify({
          accountSyncIds: accounts.map(
            (account) => account.syncId,
          ),
          expectedVersion: state.serverVersion,
        }),
      };

      await transaction.runAsync(
        `
          INSERT INTO pending_account_order_command (
            id,
            command_id,
            owner_username,
            local_revision,
            expected_version,
            request_body
          )
          VALUES (1, ?, ?, ?, ?, ?)
        `,
        prepared.commandId,
        prepared.ownerUsername,
        prepared.localRevision,
        prepared.expectedVersion,
        prepared.requestBody,
      );
    },
  );

  return prepared;
}

export async function acknowledgeAccountOrderCommand(
  database: SQLiteDatabase,
  commandId: string,
  response: AccountOrderServerResponse,
): Promise<boolean> {
  if (
    !Number.isSafeInteger(response.version) ||
    response.version < 0 ||
    !Array.isArray(response.accountSyncIds) ||
    !response.accountSyncIds.every(
      (id) => typeof id === 'string',
    )
  ) {
    throw new Error('Invalid account order server response');
  }

  const serverVersion = response.version;
  const returnedIds = [...response.accountSyncIds];

  let acknowledged = false;

  await database.withExclusiveTransactionAsync(
    async (transaction) => {
      const pending = await getPendingAccountOrderCommand(
        transaction,
      );

      if (pending === null || pending.commandId !== commandId) {
        return;
      }

      if (serverVersion !== pending.expectedVersion + 1) {
        throw new Error(
          'Unexpected account order server version',
        );
      }

      const request: unknown = JSON.parse(
        pending.requestBody,
      );

      if (
        typeof request !== 'object' ||
        request === null ||
        !('expectedVersion' in request) ||
        request.expectedVersion !== pending.expectedVersion ||
        !('accountSyncIds' in request) ||
        !Array.isArray(request.accountSyncIds) ||
        !request.accountSyncIds.every(
          (id) => typeof id === 'string',
        )
      ) {
        throw new Error(
          'Stored account order command is invalid',
        );
      }

      if (
        request.accountSyncIds.length !== returnedIds.length ||
        request.accountSyncIds.some(
          (id, index) => id !== returnedIds[index],
        )
      ) {
        throw new Error(
          'Server acknowledged a different account order',
        );
      }

      const updated = await transaction.runAsync(
        `
          UPDATE account_order_sync_state
          SET
            server_version = ?,
            synced_revision = ?
          WHERE id = 1
            AND server_owner_username = ?
            AND server_version = ?
            AND local_revision >= ?
            AND synced_revision <= ?
        `,
        serverVersion,
        pending.localRevision,
        pending.ownerUsername,
        pending.expectedVersion,
        pending.localRevision,
        pending.localRevision,
      );

      if (updated.changes !== 1) {
        throw new Error(
          'Account order sync state has changed unexpectedly',
        );
      }

      const deleted = await transaction.runAsync(
        `
          DELETE FROM pending_account_order_command
          WHERE id = 1
            AND command_id = ?
        `,
        commandId,
      );

      if (deleted.changes !== 1) {
        throw new Error(
          'Pending account order command could not be removed',
        );
      }

      acknowledged = true;
    },
  );

  return acknowledged;
}