import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

export type SyncEntityType = 'ACCOUNT' | 'CATEGORY' | 'ENTRY' | 'TRANSFER';
export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE' | 'ARCHIVE' | 'RESTORE';

export type PendingSyncCommand = {
  commandId: string;
  entityType: SyncEntityType;
  entitySyncId: string;
  operation: SyncOperation;
  payloadJson: string;
  expectedServerVersion: number | null;
  createdAt: string;
  attempts: number;
};

/** Call inside the SAME exclusive transaction as the business-data change. */
export async function enqueueSyncCommand(
  transaction: Pick<SQLiteDatabase, 'runAsync'>,
  command: {
    entityType: SyncEntityType;
    entitySyncId: string;
    operation: SyncOperation;
    payload: unknown;
    expectedServerVersion: number | null;
  },
): Promise<string> {
  const commandId = randomUUID();
  await transaction.runAsync(
    `INSERT INTO sync_outbox (
      command_id, entity_type, entity_sync_id, operation,
      payload_json, expected_server_version
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    commandId,
    command.entityType,
    command.entitySyncId,
    command.operation,
    JSON.stringify(command.payload),
    command.expectedServerVersion,
  );
  return commandId;
}

export async function getPendingSyncCommands(
  database: SQLiteDatabase,
  limit = 50,
): Promise<PendingSyncCommand[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new Error('Invalid sync outbox batch size');
  }
  return database.getAllAsync<PendingSyncCommand>(
    `SELECT command_id AS commandId, entity_type AS entityType,
      entity_sync_id AS entitySyncId, operation,
      payload_json AS payloadJson,
      expected_server_version AS expectedServerVersion,
      created_at AS createdAt, attempts
     FROM sync_outbox ORDER BY created_at, rowid LIMIT ?`,
    limit,
  );
}

/** Acknowledge ONLY after the server has durably accepted this command. */
export async function acknowledgeSyncCommand(
  database: SQLiteDatabase,
  commandId: string,
): Promise<void> {
  await database.runAsync('DELETE FROM sync_outbox WHERE command_id = ?', commandId);
}

export async function recordSyncAttempt(
  database: SQLiteDatabase,
  commandId: string,
): Promise<void> {
  await database.runAsync(
    'UPDATE sync_outbox SET attempts = attempts + 1 WHERE command_id = ?',
    commandId,
  );
}
