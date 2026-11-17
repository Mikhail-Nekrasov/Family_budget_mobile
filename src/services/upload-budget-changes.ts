import type { SQLiteDatabase } from 'expo-sqlite';

import { sendWithDependencyRecovery } from '@/services/restore-sync-dependency';
import { BudgetEntityConflictError, mergeBudgetEntityVersions, readBudgetEntityConflict, resolveBudgetEntityConflict } from '@/services/budget-entity-conflict';
import { getAccountBySyncId } from '@/repositories/account-repository';
import { getCategoryBySyncId } from '@/repositories/category-repository';
import { getEntryBySyncId, resolveEntrySyncConflict } from '@/repositories/entry-repository';
import { EntrySyncConflictError, mergeEntryVersions, readEntrySyncConflict } from '@/services/entry-sync-conflict';
import { readSyncCommandResponse } from '@/api/sync-command-request';
import {
  acknowledgeSyncCommand,
  claimNextSyncCommand,
  getPendingSyncCommands,
} from '@/repositories/sync-outbox-repository';

import { listSyncConflicts, parkSyncConflict, versionsAgree } from '@/services/pending-sync-conflicts';

import type { BudgetUploadResult } from '@/services/budget-upload-scheduler';

const BATCH_SIZE = 10;

export async function getBudgetUploadState(database: SQLiteDatabase): Promise<'blocked' | 'idle' | 'ready'> {
  const state = await database.getFirstAsync<{ canUpload: number; hasCommands: number }>(`
    SELECT (initial_sync_complete = 1 AND download_cursor IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM sync_outbox queued
          LEFT JOIN categories c ON c.sync_id = queued.entity_sync_id
          WHERE queued.entity_type = 'CATEGORY' AND queued.operation = 'CREATE'
            AND (c.default_key IS NOT NULL OR json_extract(queued.payload_json, '$.defaultKey') IS NOT NULL)
        )) AS canUpload,
      EXISTS (SELECT 1 FROM sync_outbox) AS hasCommands
    FROM sync_state WHERE id = 1
  `);
  if (!state?.canUpload) return 'blocked';
  return state.hasCommands ? 'ready' : 'idle';
}

/** Run one batch within the profile's authenticated session. */
export async function uploadBudgetChanges(
  database: SQLiteDatabase,
  headers: Record<string, string>,
  shouldContinue: () => boolean,
  onRestoredLocalEntity?: () => void,
): Promise<BudgetUploadResult> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  for (let sent = 0; sent < BATCH_SIZE; sent++) {
    if (!shouldContinue()) return 'complete';
    const command = await claimNextSyncCommand(database, timeZone);
    if (!command) {
      return (await getPendingSyncCommands(database, 1)).length && !(await listSyncConflicts(database)).length
        ? 'blocked' : 'complete';
    }

    if (!shouldContinue()) return 'complete';
    const { path, method, body } = command.request;
    try {
      const data = await sendWithDependencyRecovery(database, path, method, headers, body, shouldContinue).catch(async (error: unknown) => {
        const conflict = readEntrySyncConflict(error, command);
        if (!conflict) {
          const entityConflict = await readBudgetEntityConflict(database, headers, command, error);
          if (entityConflict) throw new BudgetEntityConflictError(entityConflict);
          throw error;
        }
        // The queued version is already usable. Local reads only enrich the comparison.
        try {
          const current = await getEntryBySyncId(database, conflict.syncId);
          if (current) {
            conflict.local = {
              title: current.title, type: current.type, amountMinor: current.amountMinor,
              dateTime: current.dateTime.slice(0, 19), description: current.description || null,
              accountSyncId: current.accountSyncId, categorySyncId: current.categorySyncId,
            };
          } else {
            const deletion = await database.getFirstAsync(
              "SELECT 1 FROM sync_outbox WHERE entity_type = 'ENTRY' AND entity_sync_id = ? AND operation = 'DELETE'",
              conflict.syncId,
            );
            conflict.localDeleted = Boolean(deletion);
          }
          const [account, category] = await Promise.all([
            getAccountBySyncId(database, conflict.local.accountSyncId),
            getCategoryBySyncId(database, conflict.local.categorySyncId),
          ]);
          conflict.local.currencyCode = account?.currencyCode;
          conflict.local.accountName = account?.name;
          conflict.local.categoryName = category?.name;
        } catch {
          // Preserve the conflict even if SQLite could not read display metadata.
        }
        throw new EntrySyncConflictError(conflict);
      });
      if (data === null && !shouldContinue()) return 'complete';
      const acknowledgement = readSyncCommandResponse(command, data);
      await acknowledgeSyncCommand(database, command.commandId, acknowledgement);
    } catch (error) {
      if (!(error instanceof EntrySyncConflictError || error instanceof BudgetEntityConflictError)) throw error;
      // A local deletion loses to a confirmed server edit. Keep the rejected
      // command available if the local snapshot cannot be restored.
      try {
        if (error instanceof EntrySyncConflictError && ((error.conflict.localDeleted && error.conflict.server)
            || versionsAgree(error.conflict) || mergeEntryVersions(error.conflict, 'server')?.disputed === false)) {
          await resolveEntrySyncConflict(database, error.conflict, 'server');
          onRestoredLocalEntity?.();
          continue;
        }
        if (error instanceof BudgetEntityConflictError && (
            mergeBudgetEntityVersions(error.conflict, 'server')?.disputed === false)) {
          await resolveBudgetEntityConflict(database, error.conflict, 'server', true);
          onRestoredLocalEntity?.();
          continue;
        }
        if (error instanceof BudgetEntityConflictError && (versionsAgree(error.conflict)
            || (command.operation === 'DELETE' && error.conflict.server && !error.conflict.local))) {
          await resolveBudgetEntityConflict(database, error.conflict, 'server');
          onRestoredLocalEntity?.();
          continue;
        }
      } catch {
        // Preserve the full conflict for an explicit decision.
      }
      await parkSyncConflict(database, command.commandId, error.conflict);
    }
  }

  return (await getPendingSyncCommands(database, 1)).length ? 'more' : 'complete';
}
