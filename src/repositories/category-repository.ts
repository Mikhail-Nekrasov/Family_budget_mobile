import { markPreferenceOrderChanged } from '@/services/budget-preferences';
import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { isIconColor } from '@/constants/icon-colors';
import type { Language } from '@/i18n/languages';
import type { Category } from '@/models/category';
import type { EntryType } from '@/models/entry-type';
import { getCategoryName } from '@/utils/category-name';
import { runBudgetMutation } from '@/database/budget-mutation';
import { enqueueSyncCommand, queueSyncDelete, queueSyncUpdate } from './sync-outbox-repository';

export type CreateCategoryInput = {
  name: string;
  type: EntryType;
  iconKey: string;
  iconColor: string | null;
};

export type UpdateCategoryInput = {
  name: string;
  iconKey: string;
  iconColor: string | null;
  language: Language;
};

type CategoryRow = Omit<Category, 'nameOverrides'> & {
  nameOverridesJson: string;
};

const CATEGORY_COLUMNS = `
  sync_id AS syncId,
  server_id AS serverId,
  server_version AS serverVersion,
  name,
  icon_key AS iconKey,
  icon_color AS iconColor,
  type,
  default_key AS defaultKey,
  name_overrides_json AS nameOverridesJson,
  sort_order AS sortOrder
`;

function fromRow(row: CategoryRow): Category {
  const parsed: unknown = JSON.parse(row.nameOverridesJson);
  const nameOverrides: Category['nameOverrides'] = {};
  if (parsed !== null && typeof parsed === 'object') {
    for (const language of ['en', 'ru', 'fi'] as const) {
      const name = (parsed as Record<string, unknown>)[language];
      if (typeof name === 'string' && name.trim() !== '') {
        nameOverrides[language] = name;
      }
    }
  }
  const { nameOverridesJson: _json, ...category } = row;
  return { ...category, nameOverrides };
}

function validateNameAndIcon(name: string, iconKey: string): void {
  if (name.trim().length === 0 || name.trim().length > 255) {
    throw new Error('Category name must contain 1 to 255 characters');
  }
  if (iconKey.trim().length === 0) {
    throw new Error('Category icon is required');
  }
}

export async function getCategories(
  database: SQLiteDatabase,
  type: EntryType,
): Promise<Category[]> {
  const rows = await database.getAllAsync<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories
     WHERE type = ? ORDER BY sort_order, rowid`,
    type,
  );
  return rows.map(fromRow);
}

export async function getCategoryBySyncId(
  database: SQLiteDatabase,
  syncId: string,
): Promise<Category | null> {
  const row = await database.getFirstAsync<CategoryRow>(
    `SELECT ${CATEGORY_COLUMNS} FROM categories WHERE sync_id = ?`,
    syncId,
  );
  return row ? fromRow(row) : null;
}

export async function createCategory(
  database: SQLiteDatabase,
  input: CreateCategoryInput,
): Promise<Category> {
  validateNameAndIcon(input.name, input.iconKey);

  if (input.iconColor !== null && !isIconColor(input.iconColor)) {
    throw new Error('Invalid category icon color');
  }

  if (input.type !== 'EXPENSE' && input.type !== 'INCOME') {
    throw new Error('Invalid category type');
  }
  const syncId = randomUUID();
  await runBudgetMutation(database, async (transaction) => {
    await transaction.runAsync(
      `
        INSERT INTO categories (
          sync_id,
          name,
          type,
          icon_key,
          icon_color,
          sort_order
        )
        SELECT
          ?, ?, ?, ?, ?,
          COALESCE(MAX(sort_order), -1) + 1
        FROM categories
        WHERE type = ?
      `,
      syncId,
      input.name.trim(),
      input.type,
      input.iconKey.trim(),
      input.iconColor?.toUpperCase() ?? null,
      input.type,
    );
    await enqueueSyncCommand(transaction, {
      entityType: 'CATEGORY', entitySyncId: syncId, operation: 'CREATE',
      payload: {
        syncId, name: input.name.trim(), type: input.type,
        iconKey: input.iconKey.trim(), iconColor: input.iconColor?.toUpperCase() ?? null,
      },
      expectedServerVersion: null,
    });
  });
  const created = await getCategoryBySyncId(database, syncId);
  if (!created) {
    throw new Error('Created category not found');
  }
  return created;
}

export async function updateCategory(
  database: SQLiteDatabase,
  syncId: string,
  input: UpdateCategoryInput,
): Promise<Category> {
  validateNameAndIcon(input.name, input.iconKey);

  if (input.iconColor !== null && !isIconColor(input.iconColor)) {
    throw new Error('Invalid category icon color');
  }

  if (!['en', 'ru', 'fi'].includes(input.language)) {
    throw new Error('Unsupported category name language');
  }

  let updated: Category | null = null;
  await runBudgetMutation(database, async (transaction) => {
    const current = await getCategoryBySyncId(transaction, syncId);
    if (!current) {
      throw new Error('Category not found');
    }
    const name = input.name.trim();
    const overrides = { ...current.nameOverrides };
    if (current.defaultKey !== null && name !== getCategoryName(current, input.language)) {
      overrides[input.language] = name;
    }
    await transaction.runAsync(
      `
        UPDATE categories
        SET
          name = ?,
          icon_key = ?,
          icon_color = ?,
          name_overrides_json = ?
        WHERE sync_id = ?
      `,
      current.defaultKey === null ? name : current.name,
      input.iconKey.trim(),
      input.iconColor?.toUpperCase() ?? null,
      JSON.stringify(overrides),
      syncId,
    );
    updated = await getCategoryBySyncId(transaction, syncId);
    if (!updated) throw new Error('Updated category not found');
    const payload = {
      syncId, name: updated.name, type: updated.type,
      iconKey: updated.iconKey, iconColor: updated.iconColor,
      defaultKey: updated.defaultKey, nameOverrides: updated.nameOverrides,
    };
    await queueSyncUpdate(transaction, {
      entityType: 'CATEGORY', entitySyncId: syncId,
      serverId: current.serverId, serverVersion: current.serverVersion,
    }, payload);
  });
  if (!updated) {
    throw new Error('Updated category not found');
  }
  return updated;
}

export async function canDeleteLocalCategory(
  database: SQLiteDatabase,
  syncId: string,
): Promise<boolean> {
  const row = await database.getFirstAsync<{ allowed: number }>(
    `SELECT NOT EXISTS (
       SELECT 1 FROM entries WHERE category_sync_id = categories.sync_id
     ) AS allowed FROM categories WHERE sync_id = ?`,
    syncId,
  );
  return row?.allowed === 1;
}

export class CategoryInUseError extends Error {
  constructor() {
    super('Cannot delete a category with entries');
    this.name = 'CategoryInUseError';
  }
}

export async function deleteLocalCategory(
  database: SQLiteDatabase,
  syncId: string,
): Promise<void> {
  await runBudgetMutation(database, async (transaction) => {
    const current = await getCategoryBySyncId(transaction, syncId);
    if (!current) throw new Error('Category not found');
    const result = await transaction.runAsync(
      `DELETE FROM categories WHERE sync_id = ? AND NOT EXISTS (
         SELECT 1 FROM entries WHERE category_sync_id = categories.sync_id
       )`,
      syncId,
    );
    if (result.changes !== 1) throw new CategoryInUseError();

    await queueSyncDelete(transaction, {
      entityType: 'CATEGORY', entitySyncId: syncId,
      serverId: current.serverId, serverVersion: current.serverVersion,
    });
  });
}

export async function saveCategoryOrder(database: SQLiteDatabase, type: EntryType, ids: string[]) {
  await runBudgetMutation(database, async (transaction) => {
    const current = await getCategories(transaction, type);
    const known = new Set(current.map(({ syncId }) => syncId));
    if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
      throw new Error('Category list changed during reordering');
    }
    for (const [index, id] of ids.entries()) {
      await transaction.runAsync('UPDATE categories SET sort_order = ? WHERE sync_id = ?', index, id);
    }
    await markPreferenceOrderChanged(transaction, `order:${type}`);
  });
}
