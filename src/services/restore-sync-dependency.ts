import type { SQLiteDatabase } from 'expo-sqlite';

import { apiRequest } from '@/api/api-client';
import { ApiError } from '@/api/api-error';
import { getCategoryBySyncId } from '@/repositories/category-repository';

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {};
}

export async function sendWithDependencyRecovery(
  database: SQLiteDatabase,
  path: string,
  method: 'POST' | 'PUT',
  headers: Record<string, string>,
  body: string,
  shouldContinue: () => boolean,
) {
  const restored = new Set<string>();
  for (;;) {
    try {
      return await apiRequest(path, { method, headers, body });
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 409) throw error;
      const data = object(error.data);
      if (data.code !== 'SYNC_DEPENDENCY_DELETED' || !shouldContinue()) throw error;
      const { entityType, syncId, restoreToken, needsCategoryDetails } = object(data.dependency);
      if ((entityType !== 'ACCOUNT' && entityType !== 'CATEGORY')
          || typeof syncId !== 'string' || typeof restoreToken !== 'string') throw error;
      const original = object(JSON.parse(body));
      const references = entityType === 'CATEGORY' ? [original.categorySyncId]
        : [original.accountSyncId, original.fromAccountSyncId, original.toAccountSyncId];
      const key = `${entityType}:${syncId}`;
      if (!references.includes(syncId) || restored.has(key)) throw error;
      restored.add(key);

      const category = entityType === 'CATEGORY' && needsCategoryDetails === true
        ? await getCategoryBySyncId(database, syncId) : null;
      if ((needsCategoryDetails === true && !category) || !shouldContinue()) throw error;

      const result = object(await apiRequest('/api/sync/dependencies/restore', {
        method: 'POST', headers,
        body: JSON.stringify({
          entityType, syncId, restoreToken,
          ...(category && {
            categoryName: category.name, categoryType: category.type, categoryVersion: category.serverVersion,
          }),
        }),
      }));
      const { id, version } = result;
      if (result.syncId !== syncId || typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0
          || typeof version !== 'number' || !Number.isSafeInteger(version) || version < 0) {
        throw new Error('Invalid dependency restore response');
      }
      const table = entityType === 'ACCOUNT' ? 'accounts' : 'categories';
      await database.runAsync(
        `UPDATE ${table} SET server_id = ?, server_version = ? WHERE sync_id = ?
           AND (server_version IS NULL OR server_version <= ?)`,
        id, version, syncId, version,
      );
      if (!shouldContinue()) return null;
    }
  }
}
