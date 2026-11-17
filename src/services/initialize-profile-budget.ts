import type { SQLiteDatabase } from 'expo-sqlite';

import { apiRequest } from '@/api/api-client';
import { ApiError } from '@/api/api-error';
import { isCurrencyCode } from '@/constants/currencies';
import { DEFAULT_CATEGORIES } from '@/constants/default-categories';
import { defaultCategoryIconColor } from '@/constants/icon-colors';
import type { EntryType } from '@/models/entry-type';
import { currencyFractionDigits, parseAmountToMinor } from '@/utils/money';

type JsonObject = Record<string, unknown>;
type Identity = { syncId: string; id: number; version: number };
type Account = Identity & {
  name: string; description: string | null; currency: string; icon: string;
  balance: number; archivedAt: string | null; activity: bigint;
};
type CategoryTemplate = typeof DEFAULT_CATEGORIES[number];
type Category = Identity & { name: string; type: EntryType; template?: CategoryTemplate };
type Entry = Identity & {
  title: string; type: EntryType; amount: number; date: string;
  description: string | null; accountId: string; categoryId: string;
};
type Transfer = Identity & {
  from: AccountReference; to: AccountReference; amount: number; credit: number;
  date: string; description: string | null;
};

const categoryTemplates = new Map<string, CategoryTemplate>(
  DEFAULT_CATEGORIES.map((template) => [template.key, template]),
);
const firstCustomSortOrder = Math.max(...DEFAULT_CATEGORIES.map((template) => template.sortOrder)) + 1;

const uuidPattern = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const localDatePattern = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?$/;

function invalid(): never {
  throw new Error('The server budget snapshot is invalid');
}

function object(value: unknown): JsonObject {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  return value as JsonObject;
}

function uuid(value: unknown): string {
  if (typeof value !== 'string' || !uuidPattern.test(value)) return invalid();
  return value.toLowerCase();
}

function integer(value: unknown, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) return invalid();
  return value;
}

function requiredText(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return invalid();
  return value;
}

function nullableText(value: unknown): string | null {
  if (value !== null && typeof value !== 'string') return invalid();
  return value;
}

function entryType(value: unknown): EntryType {
  if (value !== 'EXPENSE' && value !== 'INCOME') return invalid();
  return value;
}

function currencyCode(value: unknown): string {
  if (typeof value !== 'string' || !isCurrencyCode(value)) return invalid();
  return value;
}

function minorUnits(value: unknown, currency: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return invalid();
  const digits = currencyFractionDigits(currency);
  // Beyond this range a binary64 JSON number can merge distinct cent amounts.
  if (digits === 2 && Math.abs(value) >= 2 ** 46) return invalid();
  const minor = parseAmountToMinor(String(value), digits);
  return minor ?? invalid();
}

function positiveAmount(value: unknown, currency: string): number {
  const amount = minorUnits(value, currency);
  return amount > 0 ? amount : invalid();
}

function localDateTime(value: unknown): { local: string; milliseconds: string } {
  const match = typeof value === 'string' ? localDatePattern.exec(value) : null;
  if (!match) return invalid();
  const local = match[1];
  const date = new Date(`${local}Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== `${local}.000Z`) return invalid();
  return { local, milliseconds: (match[2] ?? '').padEnd(3, '0').slice(0, 3) };
}

function transferDate(value: unknown): string {
  const { local, milliseconds } = localDateTime(value);
  const date = new Date(`${local}.${milliseconds}`);
  if (!Number.isFinite(date.getTime())) return invalid();
  return date.toISOString();
}

async function downloadSnapshot(headers: Record<string, string>, cursor: string | null = null) {
  const mode = cursor ? 'DELTA' : 'FULL';
  const start = object(await apiRequest('/api/sync/downloads', {
    method: 'POST', headers, body: JSON.stringify({ cursor }),
  }));
  const id = uuid(start.downloadId);
  const count = integer(start.itemCount);
  if (start.mode !== mode) return invalid();

  const items: JsonObject[] = [];
  for (;;) {
    const page = object(await apiRequest(`/api/sync/downloads/${id}?after=${items.length}`, { headers }));
    if (page.mode !== mode || uuid(page.downloadId) !== id || !Array.isArray(page.items)) return invalid();
    for (const raw of page.items) {
      const item = object(raw);
      if ((item.action !== 'UPSERT' && !(mode === 'DELTA' && item.action === 'DELETE')) || item.position !== items.length + 1 || items.length >= count) return invalid();
      items.push(item);
    }
    if (page.nextAfter === null) {
      if (items.length !== count || uuid(page.nextCursor) !== id) return invalid();
      return { id, items };
    }
    if (!page.items.length || page.nextAfter !== items.length || items.length >= count || page.nextCursor !== null) {
      return invalid();
    }
  }
}

type AccountReference = Pick<Account, 'currency' | 'syncId' | 'activity'>;
type CategoryReference = Pick<Category, 'syncId' | 'type'>;

function parseBudget(
  items: JsonObject[],
  existingAccounts = new Map<string, AccountReference>(),
  existingCategories = new Map<string, CategoryReference>(),
) {
  const accounts = new Map<string, Account>();
  const categories = new Map<string, Category>();
  const entries: Entry[] = [];
  const transfers: Transfer[] = [];
  const finance: { entityType: string; identity: Identity; data: JsonObject }[] = [];

  for (const item of items) {
    const data = object(item.data);
    const syncId = uuid(item.syncId);
    if (syncId !== uuid(data.syncId)) return invalid();
    const identity = { syncId, id: integer(data.id, 1), version: integer(data.version) };
    if (item.entityType === 'ACCOUNT') {
      if (data.shared !== false) throw new UnsupportedSharedBudgetError();
      if (accounts.has(syncId)) return invalid();
      const currency = currencyCode(data.currencyCode);
      const archivedAt = nullableText(data.archivedAt);
      if (archivedAt && !Number.isFinite(Date.parse(archivedAt))) return invalid();
      accounts.set(syncId, {
        ...identity, name: requiredText(data.name), description: nullableText(data.description),
        currency, icon: requiredText(data.iconKey), balance: minorUnits(data.amount, currency),
        archivedAt, activity: 0n,
      });
    } else if (item.entityType === 'CATEGORY') {
      if (data.readOnly !== false) throw new UnsupportedSharedBudgetError();
      if (categories.has(syncId)) return invalid();
      const type = entryType(data.type);
      const template = typeof data.defaultKey === 'string' ? categoryTemplates.get(data.defaultKey) : undefined;
      categories.set(syncId, {
        ...identity, name: requiredText(data.name), type,
        template: template?.type === type ? template : undefined,
      });
    } else if (item.entityType === 'ENTRY' || item.entityType === 'TRANSFER') {
      finance.push({ entityType: item.entityType, identity, data });
    } else {
      return invalid();
    }
  }

  function accountReference(id: string) {
    return accounts.get(id) ?? existingAccounts.get(id) ?? invalid();
  }
  function categoryReference(id: string) {
    return categories.get(id) ?? existingCategories.get(id) ?? invalid();
  }

  for (const { entityType, identity, data } of finance) {
    const description = nullableText(data.description);
    if (entityType === 'ENTRY') {
      const account = accountReference(uuid(data.accountSyncId));
      const category = categoryReference(uuid(data.categorySyncId));
      const type = entryType(data.type);
      if (category.type !== type) return invalid();
      const amount = positiveAmount(data.amount, account.currency);
      account.activity += BigInt(type === 'EXPENSE' ? -amount : amount);
      entries.push({
        ...identity, title: requiredText(data.title), type, amount,
        date: localDateTime(data.dateTime).local, description,
        accountId: account.syncId, categoryId: category.syncId,
      });
    } else {
      if (data.fromAccountOwned !== true || data.toAccountOwned !== true) throw new UnsupportedSharedBudgetError();
      const from = accountReference(uuid(data.fromAccountSyncId));
      const to = accountReference(uuid(data.toAccountSyncId));
      if (from === to || data.sourceCurrencyCode !== from.currency || data.targetCurrencyCode !== to.currency) return invalid();
      const amount = positiveAmount(data.amount, from.currency);
      const credit = positiveAmount(data.targetAmount, to.currency);
      if (from.currency === to.currency && amount !== credit) return invalid();
      from.activity -= BigInt(amount);
      to.activity += BigInt(credit);
      transfers.push({ ...identity, from, to, amount, credit, date: transferDate(data.dateTime), description });
    }
  }
  return { accounts, categories, entries, transfers };
}

export class UnsupportedSharedBudgetError extends Error {}

export async function isProfileBudgetInitialized(database: SQLiteDatabase): Promise<boolean> {
  const state = await database.getFirstAsync<{ initialized: number }>(
    'SELECT initial_sync_complete AS initialized FROM sync_state WHERE id = 1',
  );
  if (!state) throw new Error('Budget sync state is missing');
  return state.initialized === 1;
}

async function insertBudget(
  transaction: SQLiteDatabase,
  budget: ReturnType<typeof parseBudget>,
  incremental = false,
) {
  let order = (await transaction.getFirstAsync<{ next: number }>(
    'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next FROM account_order',
  ))?.next ?? 0;
  for (const account of budget.accounts.values()) {
    const openingBalance = incremental ? 0 : Number(BigInt(account.balance) - account.activity);
    if (!Number.isSafeInteger(openingBalance)) return invalid();
    await transaction.runAsync(
      `INSERT INTO accounts (sync_id, server_id, server_version, name, description, currency_code,
        icon_key, opening_balance_minor, balance_minor, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(sync_id) DO UPDATE SET server_id = excluded.server_id,
         server_version = excluded.server_version, name = excluded.name,
         description = excluded.description, currency_code = excluded.currency_code,
         icon_key = excluded.icon_key, balance_minor = excluded.balance_minor,
         archived_at = excluded.archived_at
       WHERE accounts.server_version IS NULL OR accounts.server_version <= excluded.server_version`,
      account.syncId, account.id, account.version, account.name, account.description,
      account.currency, account.icon, openingBalance, account.balance, account.archivedAt,
    );
    await transaction.runAsync(
      'INSERT INTO account_order (account_sync_id, sort_order) VALUES (?, ?) ON CONFLICT(account_sync_id) DO NOTHING', account.syncId, order++,
    );
  }
  let customSortOrder = (await transaction.getFirstAsync<{ next: number }>(
    'SELECT MAX(COALESCE(MAX(sort_order) + 1, ?), ?) AS next FROM categories',
    firstCustomSortOrder, firstCustomSortOrder,
  ))?.next ?? firstCustomSortOrder;
  for (const category of budget.categories.values()) {
    const { template } = category;
    await transaction.runAsync(
      `INSERT INTO categories (sync_id, server_id, server_version, name, type,
        icon_key, default_key, sort_order, icon_color)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(sync_id) DO UPDATE SET server_id = excluded.server_id,
         server_version = excluded.server_version, name = excluded.name, type = excluded.type
       WHERE categories.server_version IS NULL OR categories.server_version <= excluded.server_version`,
      category.syncId, category.id, category.version, category.name, category.type,
      template?.iconKey ?? (category.type === 'INCOME' ? 'otherIncome' : 'otherExpense'),
      template?.key ?? null, template?.sortOrder ?? customSortOrder++,
      template ? defaultCategoryIconColor(template.key) : null,
    );
  }
  for (const entry of budget.entries) {
    await transaction.runAsync(
      `INSERT INTO entries (sync_id, server_id, server_version, title, type, amount_minor,
        date_time, description, account_sync_id, category_sync_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(sync_id) DO UPDATE SET server_id = excluded.server_id,
         server_version = excluded.server_version, title = excluded.title, type = excluded.type,
         amount_minor = excluded.amount_minor, date_time = excluded.date_time,
         description = excluded.description, account_sync_id = excluded.account_sync_id,
         category_sync_id = excluded.category_sync_id
       WHERE entries.server_version IS NULL OR entries.server_version < excluded.server_version`,
      entry.syncId, entry.id, entry.version, entry.title, entry.type, entry.amount,
      entry.date, entry.description, entry.accountId, entry.categoryId,
    );
  }
  for (const transfer of budget.transfers) {
    await transaction.runAsync(
      `INSERT INTO transfers (sync_id, server_id, server_version, from_account_sync_id, to_account_sync_id,
        amount_minor, target_amount_minor, source_currency_code, target_currency_code, date_time, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(sync_id) DO UPDATE SET server_id = excluded.server_id,
         server_version = excluded.server_version, from_account_sync_id = excluded.from_account_sync_id,
         to_account_sync_id = excluded.to_account_sync_id, amount_minor = excluded.amount_minor,
         target_amount_minor = excluded.target_amount_minor, source_currency_code = excluded.source_currency_code,
         target_currency_code = excluded.target_currency_code, date_time = excluded.date_time,
         description = excluded.description
       WHERE transfers.server_version IS NULL OR transfers.server_version < excluded.server_version`,
      transfer.syncId, transfer.id, transfer.version, transfer.from.syncId, transfer.to.syncId,
      transfer.amount, transfer.credit, transfer.from.currency, transfer.to.currency,
      transfer.date, transfer.description,
    );
  }
}

/** Import a confirmed snapshot once. Network and parsing never hold a SQLite write transaction. */
export async function initializeProfileBudget(
  database: SQLiteDatabase,
  headers: Record<string, string>,
): Promise<void> {
  if (await isProfileBudgetInitialized(database)) return;
  const { id, items } = await downloadSnapshot(headers);
  const budget = parseBudget(items);
  await database.withExclusiveTransactionAsync(async (transaction) => {
    if (await isProfileBudgetInitialized(transaction)) return;
    await insertBudget(transaction, budget);
    await transaction.runAsync(
      'UPDATE sync_state SET initial_sync_complete = 1, download_cursor = ? WHERE id = 1',
      id,
    );
  });
  // The cursor stays usable even if releasing the server's temporary pages fails.
  await apiRequest(`/api/sync/downloads/${id}/complete`, { method: 'POST', headers }).catch(() => undefined);
}


const syncTables = {
  ENTRY: 'entries', TRANSFER: 'transfers', CATEGORY: 'categories', ACCOUNT: 'accounts',
} as const;

async function updateOpeningBalances(transaction: SQLiteDatabase, budget: ReturnType<typeof parseBudget>) {
  for (const id of budget.accounts.keys()) {
    const account = await transaction.getFirstAsync<{ balance: number }>(
      'SELECT balance_minor AS balance FROM accounts WHERE sync_id = ?', id,
    );
    if (!account) return invalid();
    const activity = await transaction.getAllAsync<{ delta: number }>(`
      SELECT CASE type WHEN 'EXPENSE' THEN -amount_minor ELSE amount_minor END AS delta
        FROM entries WHERE account_sync_id = ?
      UNION ALL SELECT -amount_minor FROM transfers WHERE from_account_sync_id = ?
      UNION ALL SELECT target_amount_minor FROM transfers WHERE to_account_sync_id = ?
    `, id, id, id);
    const opening = Number(activity.reduce((balance, { delta }) => balance - BigInt(delta), BigInt(account.balance)));
    if (!Number.isSafeInteger(opening)) return invalid();
    await transaction.runAsync('UPDATE accounts SET opening_balance_minor = ? WHERE sync_id = ?', opening, id);
  }
}

async function getDownloadState(database: SQLiteDatabase) {
  return database.getFirstAsync<{ cursor: string | null; pending: number }>(`
    SELECT download_cursor AS cursor, EXISTS (SELECT 1 FROM sync_outbox) AS pending
    FROM sync_state WHERE id = 1 AND initial_sync_complete = 1
  `);
}

async function applyDownload(
  transaction: SQLiteDatabase,
  items: JsonObject[],
  full: boolean,
) {
  const upserts = items.filter((item) => item.action === 'UPSERT');
  const deleted = new Map<string, Set<string>>();
  const present = new Map<string, Set<string>>();
  for (const item of items) {
    const entity = item.entityType;
    if (typeof entity !== 'string' || !Object.hasOwn(syncTables, entity)) return invalid();
    const ids = item.action === 'DELETE' ? deleted : present;
    const id = uuid(item.syncId);
    const seen = ids.get(entity) ?? new Set<string>();
    if (seen.has(id) || (ids === deleted ? present : deleted).get(entity)?.has(id)) return invalid();
    seen.add(id);
    ids.set(entity, seen);
  }
  if (full) {
    for (const [entity, table] of Object.entries(syncTables)) {
      const rows = await transaction.getAllAsync<{ syncId: string }>(
        `SELECT sync_id AS syncId FROM ${table} WHERE server_id IS NOT NULL`,
      );
      deleted.set(entity, new Set(rows.filter(({ syncId }) => !present.get(entity)?.has(syncId))
        .map(({ syncId }) => syncId)));
    }
  }

  const accounts = await transaction.getAllAsync<{ syncId: string; currency: string }>(
    'SELECT sync_id AS syncId, currency_code AS currency FROM accounts',
  );
  const categories = await transaction.getAllAsync<{ syncId: string; type: EntryType }>(
    'SELECT sync_id AS syncId, type FROM categories',
  );
  const budget = parseBudget(upserts,
    new Map(accounts.map((account) => [account.syncId, { ...account, activity: 0n }])),
    new Map(categories.map((category) => [category.syncId, category])),
  );

  for (const entity of ['ENTRY', 'TRANSFER'] as const) {
    for (const id of deleted.get(entity) ?? []) {
      await transaction.runAsync(`DELETE FROM ${syncTables[entity]} WHERE sync_id = ?`, id);
    }
  }
  await insertBudget(transaction, budget, true);
  for (const entity of ['CATEGORY', 'ACCOUNT'] as const) {
    for (const id of deleted.get(entity) ?? []) {
      if (entity === 'ACCOUNT') {
        await transaction.runAsync('DELETE FROM account_order WHERE account_sync_id = ?', id);
      }
      await transaction.runAsync(`DELETE FROM ${syncTables[entity]} WHERE sync_id = ?`, id);
    }
  }
  if (await transaction.getFirstAsync('PRAGMA foreign_key_check')) return invalid();
  await updateOpeningBalances(transaction, budget);
}

function references(entity: string, data: JsonObject | null): string[] {
  if (!data) return [];
  const ids: Record<string, unknown[]> = entity === 'ENTRY'
    ? { ACCOUNT: [data.accountSyncId], CATEGORY: [data.categorySyncId] }
    : entity === 'TRANSFER'
      ? { ACCOUNT: [data.fromAccountSyncId ?? data.from_account_sync_id,
        data.toAccountSyncId ?? data.to_account_sync_id] }
      : {};
  return Object.entries(ids).flatMap(([type, values]) =>
    values.flatMap((id) => typeof id === 'string' ? [`${type}:${id}`] : []));
}

async function independentDownloadItems(transaction: SQLiteDatabase, items: JsonObject[]) {
  const pending = await transaction.getAllAsync<{ entity: string; id: string; operation: string; payload: string }>(
    `SELECT entity_type AS entity, entity_sync_id AS id, operation, payload_json AS payload FROM sync_outbox`,
  );
  const blocked = new Set<string>();
  const pendingCategories = new Set(pending.filter(({ entity }) => entity === 'CATEGORY')
    .map(({ id }) => `CATEGORY:${id}`));
  let unknownFinancialReferences = false;
  for (const { entity, id, operation, payload } of pending) {
    blocked.add(`${entity}:${id}`);
    if (entity !== 'ENTRY' && entity !== 'TRANSFER') continue;
    const data = object(JSON.parse(payload));
    const current = references(entity, data);
    const previous = operation === 'UPDATE' && data.conflictBase
      ? references(entity, object(data.conflictBase)) : [];
    if (current.length !== 2 || (operation === 'UPDATE' && previous.length !== 2)) {
      unknownFinancialReferences = true;
    }
    for (const key of [...current, ...previous]) blocked.add(key);
  }

  // Current and incoming relationships form indivisible sets for a partial
  // delta. Account balances and the operations they include must agree.
  const accountItems = new Set(items.filter((item) => item.entityType === 'ACCOUNT')
    .map((item) => `ACCOUNT:${uuid(item.syncId)}`));
  const categoryItems = new Set(items.filter((item) => item.entityType === 'CATEGORY')
    .map((item) => `CATEGORY:${uuid(item.syncId)}`));
  const groups = [];
  for (const item of items) {
    const entity = item.entityType;
    if (typeof entity !== 'string' || !Object.hasOwn(syncTables, entity)) return invalid();
    const id = uuid(item.syncId);
    const key = `${entity}:${id}`;
    const links = [key];
    if (entity === 'ENTRY' || entity === 'TRANSFER') {
      const row = entity === 'ENTRY'
        ? await transaction.getFirstAsync<JsonObject>(
          'SELECT account_sync_id AS accountSyncId, category_sync_id AS categorySyncId FROM entries WHERE sync_id = ?', id,
        )
        : await transaction.getFirstAsync<JsonObject>(
          'SELECT from_account_sync_id AS fromAccountSyncId, to_account_sync_id AS toAccountSyncId FROM transfers WHERE sync_id = ?', id,
        );
      const related = [
        ...references(entity, row),
        ...references(entity, item.action === 'UPSERT' ? object(item.data) : null),
      ];
      if (related.some((link) => pendingCategories.has(link))) blocked.add(key);
      links.push(...related.filter((link) => link.startsWith('ACCOUNT:') || categoryItems.has(link)));
      // A deletion with missing local history and no pending command on that
      // operation has no SQLite row to remove. An unknown pending command
      // still blocks all financial components.
      if (unknownFinancialReferences
          || links.some((link) => link.startsWith('ACCOUNT:') && !accountItems.has(link))) blocked.add(key);
    } else if ((entity === 'ACCOUNT' && unknownFinancialReferences)
        || (entity === 'CATEGORY' && item.action === 'DELETE' && (unknownFinancialReferences
          || await transaction.getFirstAsync('SELECT 1 FROM entries WHERE category_sync_id = ? LIMIT 1', id)))) {
      blocked.add(key);
    }
    groups.push({ item, links });
  }

  const groupsByLink = new Map<string, Set<number>>();
  for (const [index, { links }] of groups.entries()) {
    for (const link of links) {
      const indexes = groupsByLink.get(link) ?? new Set<number>();
      indexes.add(index);
      groupsByLink.set(link, indexes);
    }
  }
  const excluded = new Set<number>();
  for (const link of blocked) {
    for (const index of groupsByLink.get(link) ?? []) {
      if (excluded.has(index)) continue;
      excluded.add(index);
      for (const linked of groups[index].links) blocked.add(linked);
    }
  }
  return items.filter((_, index) => !excluded.has(index));
}

/** Apply a delta while preserving pending local changes and their balances. */
export async function downloadProfileBudgetChanges(
  database: SQLiteDatabase,
  headers: Record<string, string>,
): Promise<boolean> {
  const state = await getDownloadState(database);
  if (!state?.cursor) return false;
  let full = false;
  const snapshot = await downloadSnapshot(headers, state.cursor).catch((error: unknown) => {
    if (!(error instanceof ApiError) || (error.status !== 404 && error.status !== 410)) throw error;
    if (state.pending) return null;
    full = true;
    return downloadSnapshot(headers);
  });

  if (!snapshot) return false;
  let changed = false;
  await database.withExclusiveTransactionAsync(async (transaction) => {
    const current = await getDownloadState(transaction);
    if (current?.cursor !== state.cursor || (full && current.pending)) return;
    const items = current.pending ? await independentDownloadItems(transaction, snapshot.items) : snapshot.items;
    if (items.length || full) {
      await applyDownload(transaction, items, full);
      changed = true;
    }
    if (items.length === snapshot.items.length) {
      await transaction.runAsync('UPDATE sync_state SET download_cursor = ? WHERE id = 1', snapshot.id);
    }
  });
  await apiRequest(`/api/sync/downloads/${snapshot.id}/complete`, { method: 'POST', headers }).catch(() => undefined);
  return changed;
}

/** Inspect a conflict without advancing the personal budget's download cursor. */
export async function readServerConflictBudget(headers: Record<string, string>) {
  const snapshot = await downloadSnapshot(headers);
  try {
    return parseBudget(snapshot.items);
  } finally {
    await apiRequest(`/api/sync/downloads/${snapshot.id}/complete`, { method: 'POST', headers }).catch(() => undefined);
  }
}

export async function applyServerConflictEntity(
  transaction: SQLiteDatabase,
  budget: ReturnType<typeof parseBudget>,
  entity: 'ACCOUNT' | 'CATEGORY' | 'TRANSFER',
  id: string,
) {
  const selected = {
    accounts: new Map<string, Account>(),
    categories: new Map<string, Category>(),
    entries: [] as Entry[],
    transfers: [] as Transfer[],
  };
  if (entity === 'ACCOUNT') {
    const account = budget.accounts.get(id);
    if (account) selected.accounts.set(id, account);
  } else if (entity === 'CATEGORY') {
    const category = budget.categories.get(id);
    if (category) selected.categories.set(id, category);
  } else {
    const transfer = budget.transfers.find((item) => item.syncId === id);
    if (transfer) selected.transfers.push(transfer);
  }
  if (selected.accounts.size || selected.categories.size || selected.transfers.length) {
    await insertBudget(transaction, selected, false);
    const account = selected.accounts.get(id);
    if (account) {
      const activity = await transaction.getAllAsync<{ amount: number }>(
        `SELECT CASE type WHEN 'EXPENSE' THEN -amount_minor ELSE amount_minor END AS amount
           FROM entries WHERE account_sync_id = ?
         UNION ALL SELECT -amount_minor FROM transfers WHERE from_account_sync_id = ?
         UNION ALL SELECT target_amount_minor FROM transfers WHERE to_account_sync_id = ?`, id, id, id,
      );
      const opening = BigInt(account.balance) - account.activity;
      const balance = activity.reduce((total, item) => total + BigInt(item.amount), opening);
      if (!Number.isSafeInteger(Number(opening)) || !Number.isSafeInteger(Number(balance))) return invalid();
      await transaction.runAsync(
        'UPDATE accounts SET opening_balance_minor = ?, balance_minor = ? WHERE sync_id = ?',
        Number(opening), Number(balance), id,
      );
    }
    return;
  }
  if (entity === 'ACCOUNT') {
    await transaction.runAsync('DELETE FROM account_order WHERE account_sync_id = ?', id);
  }
  await transaction.runAsync(`DELETE FROM ${syncTables[entity]} WHERE sync_id = ?`, id);
}
