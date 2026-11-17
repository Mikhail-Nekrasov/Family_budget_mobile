import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { ApiError } from '@/api/api-error';
import { applyTransferBalanceChanges } from '@/repositories/transfer-repository';
import { enqueueSyncCommand, type PendingSyncCommand } from '@/repositories/sync-outbox-repository';
import { applyServerConflictEntity, readServerConflictBudget } from '@/services/initialize-profile-budget';

const tables = { ACCOUNT: 'accounts', CATEGORY: 'categories', TRANSFER: 'transfers' } as const;
type Entity = keyof typeof tables;
type Budget = Awaited<ReturnType<typeof readServerConflictBudget>>;
type Value = string | number | null;
type Row = Record<string, Value>;
type TransferBalance = Parameters<typeof applyTransferBalanceChanges>[1];

export class BudgetEntityConflictError extends Error {
  constructor(readonly conflict: BudgetEntityConflict) {
    super('Budget entity conflict');
  }
}

export type BudgetEntityConflict = {
  entity: Entity;
  command: PendingSyncCommand;
  local: Row | null;
  server: Row | null;
  version: number | null;
  reason: string;
  localAccountNames: Record<string, string>;
  canKeepLocal: boolean;
  linkedLocally: boolean;
  budget: Budget;
};

async function readLocal(database: SQLiteDatabase, entity: Entity, id: string) {
  return database.getFirstAsync<Row>(`SELECT * FROM ${tables[entity]} WHERE sync_id = ?`, id);
}

async function hasLocalDependents(database: SQLiteDatabase, entity: Entity, id: string) {
  if (entity === 'CATEGORY') {
    return Boolean(await database.getFirstAsync('SELECT 1 FROM entries WHERE category_sync_id = ? LIMIT 1', id));
  }
  if (entity === 'ACCOUNT') {
    return Boolean(await database.getFirstAsync(
      `SELECT 1 FROM entries WHERE account_sync_id = ?
       UNION ALL SELECT 1 FROM transfers WHERE from_account_sync_id = ? OR to_account_sync_id = ?
       LIMIT 1`, id, id, id,
    ));
  }
  return false;
}

function createPayload(entity: Entity, id: string, row: Row) {
  if (entity === 'ACCOUNT') {
    return { syncId: id, name: row.name, description: row.description, iconKey: row.icon_key,
      openingBalanceMinor: row.opening_balance_minor, currencyCode: row.currency_code };
  }
  if (entity === 'CATEGORY') {
    return { syncId: id, name: row.name, type: row.type };
  }
  return { syncId: id, fromAccountSyncId: row.from_account_sync_id, toAccountSyncId: row.to_account_sync_id,
    amountMinor: row.amount_minor, targetAmountMinor: row.target_amount_minor,
    sourceCurrencyCode: row.source_currency_code, targetCurrencyCode: row.target_currency_code,
    dateTime: row.date_time, description: row.description };
}

export async function readBudgetEntityConflict(
  database: SQLiteDatabase,
  headers: Record<string, string>,
  command: PendingSyncCommand,
  error: unknown,
): Promise<BudgetEntityConflict | null> {
  const { entityType: entity, entitySyncId: id, expectedServerVersion, operation } = command;
  if (!(error instanceof ApiError) || ![404, 409, 410].includes(error.status)
      || entity === 'ENTRY') return null;
  const budget = await readServerConflictBudget(headers);
  const local = await readLocal(database, entity, id);
  const account = entity === 'ACCOUNT' ? budget.accounts.get(id) : undefined;
  const category = entity === 'CATEGORY' ? budget.categories.get(id) : undefined;
  const transfer = entity === 'TRANSFER' ? budget.transfers.find((item) => item.syncId === id) : undefined;
  const remote = account ?? category ?? transfer;
  const localAccountNames = entity === 'TRANSFER'
    ? Object.fromEntries((await database.getAllAsync<{ syncId: string; name: string }>(
      'SELECT sync_id AS syncId, name FROM accounts',
    )).map(({ syncId, name }) => [syncId, name]))
    : {};
  const linkedLocally = !remote && await hasLocalDependents(database, entity, id);
  const canRecreate = !remote && operation !== 'CREATE' && local !== null && !local.default_key && !linkedLocally;
  const server: Row | null = account ? { name: account.name, description: account.description, icon_key: account.icon, archived_at: account.archivedAt }
    : category ? { name: category.name }
    : transfer ? {
        from_account_sync_id: transfer.from.syncId, to_account_sync_id: transfer.to.syncId,
        amount_minor: transfer.amount, target_amount_minor: transfer.credit, description: transfer.description,
        source_currency_code: transfer.from.currency, target_currency_code: transfer.to.currency,
        date_time: transfer.date,
      } : null;
  const relevantAccounts = new Set<string>([
    ...(account ? [account.syncId] : []),
    ...(transfer ? [transfer.from.syncId, transfer.to.syncId] : []),
  ]);
  const comparisonBudget = {
    accounts: new Map([...budget.accounts].filter(([accountId]) => relevantAccounts.has(accountId))),
    categories: category ? new Map([[category.syncId, category]]) : new Map(),
    entries: [],
    transfers: transfer ? [transfer] : [],
  };
  return {
    entity, command, local, server, version: remote?.version ?? null, budget: comparisonBudget, reason: error.message, localAccountNames, linkedLocally,
    canKeepLocal: canRecreate || (remote !== undefined && expectedServerVersion !== null && remote.version > expectedServerVersion),
  };
}

export class BudgetConflictChangedError extends Error {}

const accountFields = [['name'], ['description'], ['icon_key']];
const transferFields = [
  ['from_account_sync_id', 'to_account_sync_id', 'amount_minor', 'target_amount_minor',
    'source_currency_code', 'target_currency_code'],
  ['date_time'], ['description'],
];

export function mergeBudgetEntityVersions(conflict: BudgetEntityConflict, choice: 'local' | 'server') {
  const { entity, command, local, server, version } = conflict;
  if (entity === 'CATEGORY' || command.operation !== 'UPDATE' || !local || !server
      || version === null || command.expectedServerVersion === null || version <= command.expectedServerVersion) return null;

  const { conflictBase: base } = JSON.parse(command.payloadJson);
  if (!base || base.version !== command.expectedServerVersion) return null;
  const fields = entity === 'ACCOUNT' ? accountFields : transferFields;
  const merged = { ...local };
  let disputed = false;
  for (const group of fields) {
    if (group.some((field) => !Object.hasOwn(base, field) || !Object.hasOwn(local, field)
        || !Object.hasOwn(server, field))) return null;
    const localChange = group.some((field) => local[field] !== base[field]);
    const serverChange = group.some((field) => server[field] !== base[field]);
    const differs = group.some((field) => local[field] !== server[field]);
    const groupDisputed = localChange && serverChange && differs;
    disputed ||= groupDisputed;
    if (serverChange && (!localChange || (groupDisputed && choice === 'server'))) {
      for (const field of group) merged[field] = server[field];
    }
  }
  return {
    merged, disputed,
    needsUpload: fields.some((group) => group.some((field) => merged[field] !== server[field])),
  };
}

function localTransfer(row: Row | null): TransferBalance {
  if (!row) return null;
  const { from_account_sync_id: from, to_account_sync_id: to, amount_minor: amount, target_amount_minor: target } = row;
  if (typeof from !== 'string' || typeof to !== 'string' || typeof amount !== 'number' || typeof target !== 'number') {
    throw new Error('Transfer balance data is invalid');
  }
  return { fromAccountSyncId: from, toAccountSyncId: to, amountMinor: amount, targetAmountMinor: target };
}

export async function resolveBudgetEntityConflict(
  database: SQLiteDatabase,
  conflict: BudgetEntityConflict,
  choice: 'local' | 'server',
  automaticMerge = false,
) {
  const { command, entity, version } = conflict;
  const id = command.entitySyncId;
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const queued = await transaction.getAllAsync<{ id: string; attempts: number; version: number | null }>(
      `SELECT command_id AS id, attempts, expected_server_version AS version
       FROM sync_outbox WHERE entity_type = ? AND entity_sync_id = ? ORDER BY rowid`, entity, id,
    );
    const [head, ...later] = queued;
    const local = await readLocal(transaction, entity, id);
    if (!head || head.id !== command.commandId || head.version !== command.expectedServerVersion
        || later.some((item) => item.attempts > 0) || JSON.stringify(local) !== JSON.stringify(conflict.local)) {
      throw new BudgetConflictChangedError('The conflict changed while it was being reviewed');
    }
    const merge = later.length === 0 ? mergeBudgetEntityVersions(conflict, choice) : null;
    if (automaticMerge && (!merge || merge.disputed)) throw new BudgetConflictChangedError();
    if (merge?.needsUpload && version !== null) {
      const { merged } = merge;
      const fields = (entity === 'ACCOUNT' ? accountFields : transferFields).flat();
      if (entity === 'ACCOUNT') {
        // This command changes account metadata only. Apply the server's archive state separately.
        merged.archived_at = conflict.server?.archived_at ?? null;
        fields.push('archived_at');
      }
      if (entity === 'TRANSFER') {
        const next = localTransfer(merged);
        if (!next || next.fromAccountSyncId === next.toAccountSyncId) throw new Error('Invalid transfer accounts');
        for (const accountId of [next.fromAccountSyncId, next.toAccountSyncId]) {
          if (await readLocal(transaction, 'ACCOUNT', accountId)) continue;
          if (await transaction.getFirstAsync(
            "SELECT 1 FROM sync_outbox WHERE entity_type = 'ACCOUNT' AND entity_sync_id = ?", accountId,
          )) throw new Error('An account needed for the transfer has pending changes');
          await applyServerConflictEntity(transaction, conflict.budget, 'ACCOUNT', accountId);
        }
        await applyTransferBalanceChanges(transaction, localTransfer(local), next);
      }
      await transaction.runAsync(
        `UPDATE ${tables[entity]} SET ${fields.map((field) => `${field} = ?`).join(', ')} WHERE sync_id = ?`,
        ...fields.map((field) => merged[field]), id,
      );
      const payload = { ...createPayload(entity, id, merged), conflictBase: { ...conflict.server, version } };
      await transaction.runAsync(
        `UPDATE sync_outbox SET command_id = ?, payload_json = ?, expected_server_version = ?, attempts = 0,
          request_json = NULL, conflict_json = NULL WHERE command_id = ?`,
        randomUUID(), JSON.stringify(payload), version, command.commandId,
      );
      return;
    }
    if (choice === 'local' && !merge) {
      if (!conflict.canKeepLocal) throw new Error('The server cannot apply this local operation');
      if (version === null) {
        if (!local || local.default_key || await hasLocalDependents(transaction, entity, id)) {
          throw new Error('Other operations still depend on this item');
        }
        const replacementId = randomUUID();
        if (entity === 'ACCOUNT') {
          await transaction.execAsync('PRAGMA defer_foreign_keys = ON');
          await transaction.runAsync('UPDATE account_order SET account_sync_id = ? WHERE account_sync_id = ?', replacementId, id);
        }
        await transaction.runAsync(
          `UPDATE ${tables[entity]} SET sync_id = ?, server_id = NULL, server_version = NULL WHERE sync_id = ?`,
          replacementId, id,
        );
        await transaction.runAsync('DELETE FROM sync_outbox WHERE entity_type = ? AND entity_sync_id = ?', entity, id);
        await enqueueSyncCommand(transaction, {
          entityType: entity, entitySyncId: replacementId, operation: 'CREATE',
          payload: createPayload(entity, replacementId, local), expectedServerVersion: null,
        });
        if (entity === 'ACCOUNT' && local.archived_at) {
          await enqueueSyncCommand(transaction, {
            entityType: entity, entitySyncId: replacementId, operation: 'ARCHIVE',
            payload: { syncId: replacementId }, expectedServerVersion: null,
          });
        }
        return;
      }
      await transaction.runAsync(
        `UPDATE sync_outbox SET command_id = ?, expected_server_version = ?, attempts = 0, request_json = NULL, conflict_json = NULL
         WHERE command_id = ?`, randomUUID(), version, command.commandId,
      );
      // Keep the old row version until the server acknowledges the rebased command.
      return;
    }
    if (!conflict.server && await hasLocalDependents(transaction, entity, id)) {
      throw new Error('Other operations still depend on this item');
    }
    if (entity === 'TRANSFER') {
      const transfer = conflict.budget.transfers.find((item) => item.syncId === id);
      if (transfer) {
        for (const accountId of [transfer.from.syncId, transfer.to.syncId]) {
          if (await readLocal(transaction, 'ACCOUNT', accountId)) continue;
          if (await transaction.getFirstAsync(
            "SELECT 1 FROM sync_outbox WHERE entity_type = 'ACCOUNT' AND entity_sync_id = ?", accountId,
          )) throw new Error('An account needed for the transfer has pending changes');
          await applyServerConflictEntity(transaction, conflict.budget, 'ACCOUNT', accountId);
        }
      }
      await applyTransferBalanceChanges(transaction, localTransfer(local), transfer ? {
        fromAccountSyncId: transfer.from.syncId, toAccountSyncId: transfer.to.syncId,
        amountMinor: transfer.amount, targetAmountMinor: transfer.credit,
      } : null);
    }
    if (local) {
      await transaction.runAsync(`UPDATE ${tables[entity]} SET server_version = NULL WHERE sync_id = ?`, id);
    }
    await applyServerConflictEntity(transaction, conflict.budget, entity, id);
    if (await transaction.getFirstAsync('PRAGMA foreign_key_check')) throw new Error('Other operations still depend on this item');
    await transaction.runAsync('DELETE FROM sync_outbox WHERE entity_type = ? AND entity_sync_id = ?', entity, id);
  });
}
