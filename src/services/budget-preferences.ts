import type { SQLiteDatabase } from 'expo-sqlite';

import { apiRequest } from '@/api/api-client';
import { ApiError } from '@/api/api-error';
import { defaultCategoryIconColor } from '@/constants/icon-colors';
import { DEFAULT_CATEGORIES, type DefaultCategoryKey } from '@/constants/default-categories';

type Value = string | boolean | null | string[];
type Settings = Record<string, Value>;
type Snapshot = { revision: string; settings: Settings };
type State = { remote: Settings | null; conflicts: PreferenceConflict[] };
type Local = {
  settings: Settings;
  eligible: Set<string>;
  seed: Set<string>;
  names: Map<string, string>;
};
export type PreferenceConflict = {
  kind: 'preference';
  key: string;
  local: Value;
  server: Value;
  name?: string;
  names: Record<string, string>;
};

const path = '/api/budget-preferences';
type OrderKey = 'order:account' | 'order:EXPENSE' | 'order:INCOME';
const defaults = new Map(DEFAULT_CATEGORIES.map((item) => [item.key, item.iconKey]));

function same(left: Value | undefined, right: Value | undefined) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function isOrder(key: string) {
  return key.startsWith('order:');
}

function ids(value: Value | undefined) {
  return Array.isArray(value) ? value : [];
}

function onto(preferred: string[], members: string[]) {
  const preferredIds = new Set(preferred);
  const memberIds = new Set(members);
  return [...preferred.filter((id) => memberIds.has(id)), ...members.filter((id) => !preferredIds.has(id))];
}

function orderDiffers(left: string[], right: string[]) {
  const leftIds = new Set(left);
  const rightIds = new Set(right);
  return !same(left.filter((id) => rightIds.has(id)), right.filter((id) => leftIds.has(id)));
}

export async function markPreferenceOrderChanged(transaction: SQLiteDatabase, key: OrderKey) {
  await transaction.runAsync(`
    INSERT INTO budget_preferences_dirty VALUES (?, lower(hex(randomblob(16))))
    ON CONFLICT(key) DO UPDATE SET token = excluded.token
  `, key);
}

async function readState(db: SQLiteDatabase): Promise<State> {
  const row = await db.getFirstAsync<{ remote: string | null; conflicts: string }>(
    'SELECT remote_json AS remote, conflicts_json AS conflicts FROM budget_preferences_state WHERE id = 1',
  );
  if (!row) throw new Error('Budget preferences state is missing');
  return { remote: row.remote === null ? null : JSON.parse(row.remote), conflicts: JSON.parse(row.conflicts) };
}

export async function listPreferenceConflicts(db: SQLiteDatabase) {
  return (await readState(db)).conflicts;
}

async function readLocal(db: SQLiteDatabase): Promise<Local> {
  const accounts = await db.getAllAsync<{
    id: string; serverId: number | null; name: string; color: string | null; hidden: number;
  }>(`
    SELECT a.sync_id AS id, a.server_id AS serverId, a.name, a.icon_color AS color, a.is_hidden AS hidden
    FROM accounts a JOIN account_order o ON a.sync_id = o.account_sync_id
    ORDER BY o.sort_order, a.sync_id
  `);
  const categories = await db.getAllAsync<{
    id: string; serverId: number | null; name: string; type: string; color: string | null;
    icon: string; defaultKey: DefaultCategoryKey | null;
  }>(`
    SELECT sync_id AS id, server_id AS serverId, name, type, icon_color AS color,
      icon_key AS icon, default_key AS defaultKey FROM categories ORDER BY sort_order, rowid
  `);
  const settings: Settings = {
    'order:account': accounts.map(({ id }) => id),
    'order:EXPENSE': categories.filter(({ type }) => type === 'EXPENSE').map(({ id }) => id),
    'order:INCOME': categories.filter(({ type }) => type === 'INCOME').map(({ id }) => id),
  };
  const eligible = new Set<string>();
  if (accounts.every(({ serverId }) => serverId !== null)) eligible.add('order:account');
  for (const type of ['EXPENSE', 'INCOME']) {
    if (categories.every((category) => category.type !== type || category.serverId !== null)) {
      eligible.add(`order:${type}`);
    }
  }
  const seed = new Set<string>();
  const names = new Map<string, string>();
  for (const { id, name, serverId, color, hidden } of accounts) {
    names.set(id, name);
    settings[`account:${id}:color`] = color;
    settings[`account:${id}:hidden`] = Boolean(hidden);
    if (serverId !== null) {
      eligible.add(`account:${id}:color`);
      eligible.add(`account:${id}:hidden`);
    }
    if (color !== null) seed.add(`account:${id}:color`);
    if (hidden) seed.add(`account:${id}:hidden`);
  }
  for (const { id, name, serverId, color, icon, defaultKey } of categories) {
    names.set(id, name);
    settings[`category:${id}:color`] = color;
    settings[`category:${id}:icon`] = icon;
    if (serverId !== null) {
      eligible.add(`category:${id}:color`);
      eligible.add(`category:${id}:icon`);
    }
    if (defaultKey ? color !== defaultCategoryIconColor(defaultKey) : color !== null) {
      seed.add(`category:${id}:color`);
    }
    if (!defaultKey || icon !== defaults.get(defaultKey)) seed.add(`category:${id}:icon`);
  }
  return { settings, eligible, seed, names };
}

async function fetchSnapshot(headers: Record<string, string>, body?: Snapshot) {
  const response = await apiRequest(path, body
    ? { method: 'PUT', headers, body: JSON.stringify(body) } : { headers });
  if (!response || typeof response !== 'object' || !('revision' in response) || typeof response.revision !== 'string'
    || !('settings' in response) || !response.settings || typeof response.settings !== 'object'
    || Array.isArray(response.settings)) throw new Error('Invalid budget preferences response');
  return response as Snapshot;
}

async function applySetting(db: SQLiteDatabase, local: Local, key: string, value: Value) {
  if (isOrder(key)) {
    const ordered = onto(ids(value), ids(local.settings[key]));
    for (const [index, id] of ordered.entries()) {
      if (key === 'order:account') {
        await db.runAsync('UPDATE account_order SET sort_order = ? WHERE account_sync_id = ?', index, id);
      } else {
        await db.runAsync('UPDATE categories SET sort_order = ? WHERE sync_id = ?', index, id);
      }
    }
  } else {
    const [entity, id, field] = key.split(':');
    const table = entity === 'account' ? 'accounts' : 'categories';
    const columns = { color: 'icon_color', icon: 'icon_key', hidden: 'is_hidden' } as const;
    await db.runAsync(`UPDATE ${table} SET ${columns[field as keyof typeof columns]} = ? WHERE sync_id = ?`,
      typeof value === 'boolean' ? Number(value) : value as string | null, id);
  }
}

async function readDirty(db: SQLiteDatabase) {
  return new Map((await db.getAllAsync<{ key: string; token: string }>(
    'SELECT key, token FROM budget_preferences_dirty',
  )).map(({ key, token }) => [key, token]));
}

async function reconcileOnce(db: SQLiteDatabase, headers: Record<string, string>) {
  const incoming = await fetchSnapshot(headers);
  let plan!: { state: State; local: Local; dirty: Map<string, string> };
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const state = await readState(transaction);
    const local = await readLocal(transaction);
    if (state.remote === null) {
      const revision = await transaction.getFirstAsync<{ edited: number }>(
        'SELECT local_revision AS edited FROM account_order_sync_state WHERE id = 1',
      );
      if (revision?.edited) local.seed.add('order:account');
      for (const key of local.seed) {
        await transaction.runAsync(
          "INSERT INTO budget_preferences_dirty VALUES (?, 'seed') ON CONFLICT(key) DO NOTHING", key,
        );
      }
    }
    plan = { state, local, dirty: await readDirty(transaction) };
  });

  const { local, state, dirty } = plan;
  const patch: Settings = {};
  const conflicts: PreferenceConflict[] = [];
  const base = state.remote ?? {};
  for (const [key, value] of Object.entries(local.settings)) {
    if (!local.eligible.has(key)) continue;
    const server = incoming.settings[key];
    const old = base[key];
    const token = dirty.get(key);
    if (!token || (token === 'seed' && server !== undefined)) continue;
    let proposed = value;
    let disputed = server !== undefined && !same(old, server) && !same(value, server);
    if (isOrder(key)) {
      const localIds = ids(value);
      const remoteIds = ids(server);
      const baseline = ids(old);
      const remoteMoved = server !== undefined && (old === undefined || !same(onto(baseline, remoteIds), remoteIds));
      const localMoved = token === 'seed' || old === undefined || !same(onto(baseline, localIds), localIds);
      disputed = localMoved && remoteMoved && orderDiffers(localIds, remoteIds);
      if (!localMoved) continue;
      proposed = onto(localIds, [...new Set([...localIds, ...remoteIds])]);
    }
    if (disputed) {
      conflicts.push({ kind: 'preference', key, local: value, server,
        name: local.names.get(key.split(':')[1]),
        names: isOrder(key) ? Object.fromEntries([...new Set([...ids(value), ...ids(server)])]
          .flatMap((id) => local.names.has(id) ? [[id, local.names.get(id)!]] : [])) : {},
      });
    } else if (!same(proposed, server)) {
      patch[key] = proposed;
    }
  }

  const confirmed = Object.keys(patch).length
    ? await fetchSnapshot(headers, { revision: incoming.revision, settings: patch }) : incoming;
  let changed = false;
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const latest = await readState(transaction);
    if (JSON.stringify(latest.remote) !== JSON.stringify(state.remote)
        || JSON.stringify(latest.conflicts) !== JSON.stringify(state.conflicts)) return;
    const current = await readLocal(transaction);
    const tokens = await readDirty(transaction);
    const blocked = new Set(conflicts.map(({ key }) => key));
    const nextBase = { ...confirmed.settings };
    await transaction.runAsync('UPDATE budget_preferences_state SET applying = 1 WHERE id = 1');
    for (const [key, value] of Object.entries(current.settings)) {
      if (!current.eligible.has(key)) continue;
      if (nextBase[key] === undefined && isOrder(key)) nextBase[key] = base[key] ?? local.settings[key];
      if (blocked.has(key)) {
        if (base[key] === undefined) delete nextBase[key];
        else nextBase[key] = base[key];
        continue;
      }
      if (tokens.get(key) !== dirty.get(key)) {
        if (!Object.hasOwn(patch, key) && !same(nextBase[key], base[key])) {
          if (base[key] === undefined) delete nextBase[key];
          else nextBase[key] = base[key];
        }
        continue;
      }
      const setting = confirmed.settings[key];
      if (setting !== undefined) {
        const display = isOrder(key) ? onto(ids(setting), ids(value)) : setting;
        if (!same(display, value)) {
          await applySetting(transaction, current, key, setting);
          changed = true;
        }
      }
      if (tokens.has(key)) await transaction.runAsync('DELETE FROM budget_preferences_dirty WHERE key = ?', key);
    }
    for (const key of tokens.keys()) {
      if (!Object.hasOwn(current.settings, key)) {
        await transaction.runAsync('DELETE FROM budget_preferences_dirty WHERE key = ?', key);
      }
    }
    await transaction.runAsync(
      'UPDATE budget_preferences_state SET applying = 0, remote_json = ?, conflicts_json = ? WHERE id = 1',
      JSON.stringify(nextBase), JSON.stringify(conflicts),
    );
  });
  return changed;
}

export async function syncBudgetPreferences(db: SQLiteDatabase, headers: Record<string, string>) {
  try {
    return await reconcileOnce(db, headers);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 409) throw error;
    return reconcileOnce(db, headers);
  }
}

export async function resolvePreferenceConflict(
  db: SQLiteDatabase,
  conflict: PreferenceConflict,
  choice: 'local' | 'server',
  headers: Record<string, string>,
) {
  const { settings } = await fetchSnapshot(headers);
  await db.withExclusiveTransactionAsync(async (transaction) => {
    const state = await readState(transaction);
    const local = await readLocal(transaction);
    const { key } = conflict;
    if (!state.remote || !same(settings[key], conflict.server) || !same(local.settings[key], conflict.local)) return;
    if (choice === 'server') {
      await transaction.runAsync('UPDATE budget_preferences_state SET applying = 1 WHERE id = 1');
      await applySetting(transaction, local, key, conflict.server);
      await transaction.runAsync('DELETE FROM budget_preferences_dirty WHERE key = ?', key);
    }
    state.remote[key] = conflict.server;
    await transaction.runAsync(
      'UPDATE budget_preferences_state SET applying = 0, remote_json = ?, conflicts_json = ? WHERE id = 1',
      JSON.stringify(state.remote), JSON.stringify(state.conflicts.filter((item) => item.key !== key)),
    );
  });
}
