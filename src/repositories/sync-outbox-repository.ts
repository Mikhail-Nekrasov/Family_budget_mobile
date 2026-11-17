import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  buildSyncCommandRequest,
  type SyncCommandAcknowledgement,
  type SyncCommandRequest,
} from '@/api/sync-command-request';

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

const COMMAND_COLUMNS = `
  command_id AS commandId, entity_type AS entityType,
  entity_sync_id AS entitySyncId, operation,
  payload_json AS payloadJson, expected_server_version AS expectedServerVersion,
  created_at AS createdAt, attempts
`;

const COMMAND_ORDER = `
  CASE WHEN operation = 'CREATE' AND entity_type IN ('ACCOUNT', 'CATEGORY') THEN 0
    ELSE 1
  END, rowid
`;

type SyncEntity = {
  entityType: SyncEntityType;
  entitySyncId: string;
  serverId: number | null;
  serverVersion: number | null;
};

/** Call inside the same transaction as the local edit. */
export async function queueSyncUpdate(
  transaction: SQLiteDatabase,
  entity: SyncEntity,
  payload: object,
  createFields: object = {},
): Promise<void> {
  const latest = await transaction.getFirstAsync<
    Pick<PendingSyncCommand, 'commandId' | 'operation' | 'attempts' | 'payloadJson'>
  >(
    `SELECT command_id AS commandId, operation, attempts, payload_json AS payloadJson
     FROM sync_outbox WHERE entity_type = ? AND entity_sync_id = ?
     ORDER BY rowid DESC LIMIT 1`,
    entity.entityType, entity.entitySyncId,
  );

  if (latest?.attempts === 0 && (latest.operation === 'CREATE' || latest.operation === 'UPDATE')) {
    await transaction.runAsync(
      'UPDATE sync_outbox SET payload_json = ? WHERE command_id = ?',
      JSON.stringify(latest.operation === 'CREATE' ? { ...createFields, ...payload } : {
        ...payload,
        conflictBase: JSON.parse(latest.payloadJson).conflictBase,
      }),
      latest.commandId,
    );
    return;
  }

  const create = entity.serverId === null && !latest;
  await enqueueSyncCommand(transaction, {
    ...entity,
    operation: create ? 'CREATE' : 'UPDATE',
    payload: create ? { ...createFields, ...payload } : payload,
    expectedServerVersion: entity.serverVersion,
  });
}

/** Call inside the same transaction as the local deletion. */
export async function queueSyncDelete(
  transaction: SQLiteDatabase,
  entity: SyncEntity,
  dependencies: object = {},
): Promise<void> {
  if (entity.serverId === null) {
    const attempted = await transaction.getFirstAsync<{ attempted: number }>(
      `SELECT 1 AS attempted FROM sync_outbox
       WHERE entity_type = ? AND entity_sync_id = ? AND attempts > 0 LIMIT 1`,
      entity.entityType, entity.entitySyncId,
    );
    if (!attempted) {
      await transaction.runAsync(
        'DELETE FROM sync_outbox WHERE entity_type = ? AND entity_sync_id = ?',
        entity.entityType, entity.entitySyncId,
      );
      return;
    }
  }

  await enqueueSyncCommand(transaction, {
    ...entity,
    operation: 'DELETE',
    payload: { syncId: entity.entitySyncId, ...dependencies },
    expectedServerVersion: entity.serverVersion,
  });
}

export async function getPendingSyncCommands(
  database: SQLiteDatabase,
  limit = 50,
): Promise<PendingSyncCommand[]> {
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) {
    throw new Error('Invalid sync outbox batch size');
  }
  return database.getAllAsync<PendingSyncCommand>(
    `SELECT ${COMMAND_COLUMNS} FROM sync_outbox ORDER BY ${COMMAND_ORDER} LIMIT ?`,
    limit,
  );
}

type ClaimedSyncCommand = PendingSyncCommand & {
  request: SyncCommandRequest;
};

function readStoredRequest(json: string): SyncCommandRequest {
  const request = JSON.parse(json) as Partial<SyncCommandRequest> | null;
  if (request === null || typeof request.path !== 'string'
      || typeof request.body !== 'string'
      || (request.method !== 'POST' && request.method !== 'PUT')) {
    throw new Error('Invalid stored sync request');
  }
  return { path: request.path, method: request.method, body: request.body };
}

/** Return the next request only after its bytes and attempt count have been committed. */
export async function claimNextSyncCommand(
  database: SQLiteDatabase,
  transferTimeZone?: string,
): Promise<ClaimedSyncCommand | null> {
  let claimed: ClaimedSyncCommand | null = null;

  await database.withExclusiveTransactionAsync(async (transaction) => {
    const selected = await transaction.getFirstAsync<PendingSyncCommand & { requestJson: string | null }>(
      `SELECT ${COMMAND_COLUMNS}, request_json AS requestJson FROM sync_outbox AS candidate
       WHERE candidate.conflict_json IS NULL
         AND (candidate.operation = 'CREATE' OR candidate.expected_server_version IS NOT NULL)
         AND NOT EXISTS (
           SELECT 1 FROM sync_outbox AS dependency
           WHERE dependency.command_id <> candidate.command_id AND (
             (dependency.rowid < candidate.rowid AND dependency.entity_type = candidate.entity_type
               AND dependency.entity_sync_id = candidate.entity_sync_id)
             OR (candidate.entity_type IN ('ENTRY', 'TRANSFER')
               AND dependency.entity_type IN ('ACCOUNT', 'CATEGORY')
               AND dependency.operation IN ('CREATE', 'DELETE', 'ARCHIVE', 'RESTORE')
               AND (dependency.rowid < candidate.rowid OR dependency.operation = 'CREATE')
               AND dependency.entity_sync_id IN (
                 json_extract(candidate.payload_json, '$.accountSyncId'),
                 json_extract(candidate.payload_json, '$.categorySyncId'),
                 json_extract(candidate.payload_json, '$.fromAccountSyncId'),
                 json_extract(candidate.payload_json, '$.toAccountSyncId')
               ))
             OR (candidate.operation = 'DELETE' AND candidate.entity_type IN ('ACCOUNT', 'CATEGORY')
               AND dependency.entity_type IN ('ENTRY', 'TRANSFER') AND dependency.rowid < candidate.rowid)
           )
         )
       ORDER BY CASE WHEN attempts > 0 THEN 0 ELSE 1 END, ${COMMAND_ORDER}
       LIMIT 1`,
    );
    if (!selected) return;

    const { requestJson, ...command } = selected;
    if (command.operation !== 'CREATE' && command.expectedServerVersion === null) return;

    let request: SyncCommandRequest;
    if (requestJson !== null) {
      request = readStoredRequest(requestJson);
    } else {
      if (command.attempts > 0) {
        throw new Error('Attempted sync command has no stored request');
      }

      const entryAccount = command.entityType === 'ENTRY' && command.operation !== 'DELETE'
        ? await transaction.getFirstAsync<{ currencyCode: string }>(
            `SELECT currency_code AS currencyCode FROM accounts
             WHERE sync_id = json_extract(?, '$.accountSyncId')`,
            command.payloadJson,
          )
        : null;

      request = buildSyncCommandRequest(command, {
        entryAccountCurrencyCode: entryAccount?.currencyCode,
        transferTimeZone,
      });
    }

    await transaction.runAsync(
      `UPDATE sync_outbox
       SET attempts = attempts + 1, request_json = COALESCE(request_json, ?)
       WHERE command_id = ?`,
      requestJson === null ? JSON.stringify(request) : null,
      command.commandId,
    );
    claimed = { ...command, attempts: command.attempts + 1, request };
  });

  return claimed;
}

const ENTITY_TABLE = {
  ACCOUNT: 'accounts',
  CATEGORY: 'categories',
  ENTRY: 'entries',
  TRANSFER: 'transfers',
} as const;

/** Apply a durable server acknowledgement together with its local metadata. */
export async function acknowledgeSyncCommand(
  database: SQLiteDatabase,
  commandId: string,
  acknowledgement: SyncCommandAcknowledgement,
): Promise<void> {
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const command = await transaction.getFirstAsync<PendingSyncCommand>(
      `SELECT ${COMMAND_COLUMNS} FROM sync_outbox WHERE command_id = ? AND attempts > 0 AND request_json IS NOT NULL`,
      commandId,
    );
    if (!command) return;

    if (command.operation !== 'DELETE') {
      const serverEntity = acknowledgement.entity;
      if (!serverEntity || !Number.isSafeInteger(serverEntity.id) || serverEntity.id <= 0
        || !Number.isSafeInteger(serverEntity.version) || serverEntity.version < 0) {
        throw new Error('Missing or invalid server sync metadata');
      }

      await transaction.runAsync(
        `UPDATE ${ENTITY_TABLE[command.entityType]} SET server_id = ?, server_version = ? WHERE sync_id = ?`,
        serverEntity.id, serverEntity.version, command.entitySyncId,
      );
      await transaction.runAsync(
        `UPDATE sync_outbox SET expected_server_version = ?
         WHERE command_id = (
           SELECT command_id FROM sync_outbox
           WHERE entity_type = ? AND entity_sync_id = ? AND command_id <> ?
           ORDER BY rowid LIMIT 1
         ) AND attempts = 0 AND operation <> 'CREATE'`,
        serverEntity.version, command.entityType, command.entitySyncId, commandId,
      );
    }

    for (const change of acknowledgement.accountVersionChanges) {
      const { accountSyncId, previousVersion, version } = change;
      const advanced = await transaction.runAsync(
        `UPDATE accounts SET server_version = ?
         WHERE sync_id = ? AND server_id IS NOT NULL AND server_version = ?`,
        version, accountSyncId, previousVersion,
      );
      if (advanced.changes !== 1) continue;

      // Rebase only the next account command if it knew this exact prior version.
      await transaction.runAsync(
        `UPDATE sync_outbox SET expected_server_version = ?
         WHERE command_id = (
           SELECT command_id FROM sync_outbox
           WHERE entity_type = 'ACCOUNT' AND entity_sync_id = ?
           ORDER BY rowid LIMIT 1
         ) AND attempts = 0 AND request_json IS NULL AND expected_server_version = ?`,
        version, accountSyncId, previousVersion,
      );
    }

    await transaction.runAsync('DELETE FROM sync_outbox WHERE command_id = ?', commandId);
  });
}
