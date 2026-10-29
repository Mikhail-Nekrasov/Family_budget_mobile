import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Category } from '@/models/category';
import type { EntryType } from '@/models/entry-type';

export type CreateCategoryInput = {
  name: string;
  type: EntryType;
};

const CATEGORY_COLUMNS = `
  sync_id AS syncId,
  server_id AS serverId,
  server_version AS serverVersion,
  name,
  type
`;

export async function getCategories(
  database: SQLiteDatabase,
  type: EntryType,
): Promise<Category[]> {
  return database.getAllAsync<Category>(
    `
      SELECT ${CATEGORY_COLUMNS}
      FROM categories
      WHERE type = ?
      ORDER BY name, sync_id
    `,
    type,
  );
}

export async function getCategoryBySyncId(
  database: SQLiteDatabase,
  syncId: string,
): Promise<Category | null> {
  return database.getFirstAsync<Category>(
    `
      SELECT ${CATEGORY_COLUMNS}
      FROM categories
      WHERE sync_id = ?
    `,
    syncId,
  );
}

export async function createCategory(
  database: SQLiteDatabase,
  input: CreateCategoryInput,
): Promise<Category> {
  const name = input.name.trim();

  if (name.length === 0) {
    throw new Error('Category name is required');
  }

  if (input.type !== 'EXPENSE' && input.type !== 'INCOME') {
    throw new Error('Invalid category type');
  }

  const category: Category = {
    syncId: randomUUID(),
    serverId: null,
    serverVersion: null,
    name,
    type: input.type,
  };

  await database.runAsync(
    `
      INSERT INTO categories (
        sync_id,
        server_id,
        server_version,
        name,
        type
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    category.syncId,
    category.serverId,
    category.serverVersion,
    category.name,
    category.type,
  );

  return category;
}