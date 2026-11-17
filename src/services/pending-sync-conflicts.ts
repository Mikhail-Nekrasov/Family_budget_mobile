import type { PreferenceConflict } from '@/services/budget-preferences';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { BudgetEntityConflict } from '@/services/budget-entity-conflict';
import type { EntrySyncConflict } from '@/services/entry-sync-conflict';
import { readServerConflictBudget } from '@/services/initialize-profile-budget';

type BudgetConflict = EntrySyncConflict | BudgetEntityConflict;
export type SyncConflict = BudgetConflict | PreferenceConflict;

export function syncConflictId(conflict: SyncConflict) {
  if ('kind' in conflict) return conflict.key;
  return 'entity' in conflict ? conflict.command.commandId : conflict.commandId;
}

export function versionsAgree(conflict: BudgetConflict) {
  if (!conflict.server) return false;
  if (!('entity' in conflict)) {
    if (conflict.localDeleted) return false;
    const { local, server } = conflict;
    return local.title === server.title && local.type === server.type
      && local.amountMinor === server.amountMinor && local.dateTime === server.dateTime
      && local.description === server.description && local.accountSyncId === server.accountSyncId
      && local.categorySyncId === server.categorySyncId;
  }
  if (!conflict.local || conflict.command.operation === 'CREATE') return false;
  const { local, server } = conflict;
  if (conflict.entity === 'ACCOUNT') {
    return local.name === server.name && (local.description || null) === (server.description || null)
      && local.icon_key === server.icon_key && Boolean(local.archived_at) === Boolean(server.archived_at);
  }
  if (conflict.entity === 'CATEGORY') return local.name === server.name;
  return local.from_account_sync_id === server.from_account_sync_id
    && local.to_account_sync_id === server.to_account_sync_id
    && local.amount_minor === server.amount_minor && local.target_amount_minor === server.target_amount_minor
    && local.source_currency_code === server.source_currency_code && local.target_currency_code === server.target_currency_code
    && local.date_time === server.date_time && (local.description || null) === (server.description || null);
}

export async function parkSyncConflict(database: SQLiteDatabase, commandId: string, conflict: BudgetConflict) {
  const json = JSON.stringify(conflict, (_key, value: unknown) => {
    if (value instanceof Map) return { $map: [...value.entries()] };
    if (typeof value === 'bigint') return { $integer: value.toString() };
    return value;
  });
  const result = await database.runAsync('UPDATE sync_outbox SET conflict_json = ? WHERE command_id = ?', json, commandId);
  if (result.changes !== 1) throw new Error('The failed operation is no longer queued');
}

export async function listSyncConflicts(database: SQLiteDatabase): Promise<BudgetConflict[]> {
  const rows = await database.getAllAsync<{ json: string }>(
    'SELECT conflict_json AS json FROM sync_outbox WHERE conflict_json IS NOT NULL ORDER BY rowid',
  );
  return rows.map(({ json }) => JSON.parse(json, (_key, value: unknown) => {
    if (value && typeof value === 'object') {
      if ('$map' in value && Array.isArray(value.$map)) return new Map(value.$map);
      if ('$integer' in value && typeof value.$integer === 'string') return BigInt(value.$integer);
    }
    return value;
  }) as BudgetConflict);
}

export async function clearSyncConflict(database: SQLiteDatabase, commandId: string) {
  await database.runAsync('UPDATE sync_outbox SET conflict_json = NULL WHERE command_id = ?', commandId);
}


export async function isConflictServerVersionCurrent(
  conflict: BudgetConflict,
  headers: Record<string, string>,
): Promise<boolean> {
  const budget = await readServerConflictBudget(headers);
  if (!('entity' in conflict)) {
    const current = budget.entries.find((entry) => entry.syncId === conflict.syncId);
    return (current?.version ?? null) === (conflict.server?.version ?? null);
  }

  const id = conflict.command.entitySyncId;
  const entity = conflict.entity === 'ACCOUNT' ? budget.accounts.get(id)
    : conflict.entity === 'CATEGORY' ? budget.categories.get(id)
      : budget.transfers.find((transfer) => transfer.syncId === id);
  return (entity?.version ?? null) === conflict.version;
}
