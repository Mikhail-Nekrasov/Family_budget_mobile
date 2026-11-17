import { ApiError } from '@/api/api-error';
import { isCurrencyCode } from '@/constants/currencies';
import type { Entry } from '@/models/entry';
import { currencyFractionDigits, parseAmountToMinor } from '@/utils/money';

export type EntryConflictVersion = Pick<Entry,
  'title' | 'type' | 'amountMinor' | 'dateTime' | 'description' | 'accountSyncId' | 'categorySyncId'
>;

export type EntrySyncConflict = {
  commandId: string;
  syncId: string;
  expectedVersion: number;
  server: (EntryConflictVersion & {
    version: number;
    id: number | null;
    currencyCode: string;
    accountName: string;
    categoryName: string;
    editor: string | null;
  }) | null;
  local: EntryConflictVersion & {
    currencyCode?: string;
    accountName?: string;
    categoryName?: string;
  };
  base: EntryConflictVersion | null;
  localDeleted?: boolean;
};

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function version(value: Record<string, unknown>): EntryConflictVersion | null {
  const { title, type, amountMinor, dateTime, description, accountSyncId, categorySyncId } = value;
  if (typeof title !== 'string' || (type !== 'INCOME' && type !== 'EXPENSE')
      || typeof amountMinor !== 'number' || !Number.isSafeInteger(amountMinor) || amountMinor <= 0
      || typeof dateTime !== 'string' || (description !== null && typeof description !== 'string')
      || typeof accountSyncId !== 'string' || typeof categorySyncId !== 'string') return null;
  return { title, type, amountMinor, dateTime: dateTime.slice(0, 19), description: description || null, accountSyncId, categorySyncId };
}

export class EntrySyncConflictError extends Error {
  constructor(readonly conflict: EntrySyncConflict) {
    super('Entry version conflict');
  }
}

export function readEntrySyncConflict(
  error: unknown,
  command: { commandId: string; entityType: string; operation: string; entitySyncId: string; expectedServerVersion: number | null; payloadJson: string },
): EntrySyncConflict | null {
  if (!(error instanceof ApiError) || command.entityType !== 'ENTRY'
      || (command.operation !== 'UPDATE' && command.operation !== 'DELETE')
      || command.expectedServerVersion === null) return null;
  if (error.status !== 409 && !(error.status === 410 && command.operation === 'UPDATE')) return null;
  const payload = object(JSON.parse(command.payloadJson));
  const base = object(payload.conflictBase);
  const local = version(payload);
  if (error.status === 410) {
    return local && {
      commandId: command.commandId, syncId: command.entitySyncId, expectedVersion: command.expectedServerVersion,
      local, server: null, base: base.version === command.expectedServerVersion ? version(base) : null,
    };
  }
  const response = object(error.data);
  const remote = object(response.serverEntry);
  if (response.code !== 'ENTRY_VERSION_CONFLICT' || remote.syncId !== command.entitySyncId
      || typeof remote.version !== 'number' || !Number.isSafeInteger(remote.version)
      || remote.version <= command.expectedServerVersion || typeof remote.currencyCode !== 'string'
      || !isCurrencyCode(remote.currencyCode) || typeof remote.amount !== 'string'
      || typeof remote.accountName !== 'string' || typeof remote.categoryName !== 'string') return null;

  const server = version({
    ...remote,
    amountMinor: parseAmountToMinor(remote.amount, currencyFractionDigits(remote.currencyCode)),
  });

  const localDeleted = command.operation === 'DELETE';
  const localVersion = localDeleted ? server : local;
  if (!localVersion || !server || server.type !== localVersion.type) return null;
  const editor = object(remote.lastEditedBy).username;
  return {
    commandId: command.commandId, syncId: command.entitySyncId, expectedVersion: command.expectedServerVersion,
    local: localVersion, localDeleted, base: base.version === command.expectedServerVersion ? version(base) : null,
    server: {
      ...server, version: remote.version, currencyCode: remote.currencyCode,
      id: typeof remote.id === 'number' && Number.isSafeInteger(remote.id) && remote.id > 0 ? remote.id : null,
      accountName: remote.accountName, categoryName: remote.categoryName,
      editor: typeof editor === 'string' ? editor : null,
    },
  };
}

const mergeFields = ['title', 'dateTime', 'description', 'categorySyncId'] as const;

/** Treat the amount and its account as a unit because the account determines the currency. */
export function mergeEntryVersions(conflict: EntrySyncConflict, choice: 'local' | 'server') {
  const { base, local, server } = conflict;
  if (!base || !server || conflict.localDeleted) return null;
  const selected = choice === 'local' ? local : server;
  let disputed = false;
  const merged = { ...server };

  for (const field of mergeFields) {
    const changedLocally = local[field] !== base[field];
    const changedRemotely = server[field] !== base[field];
    if (changedLocally && changedRemotely && local[field] !== server[field]) disputed = true;
    const value = changedLocally && changedRemotely ? selected[field] : changedLocally ? local[field] : server[field];
    // Each key retains its own nullable/non-nullable type.
    Object.assign(merged, { [field]: value });
    if (field === 'categorySyncId' && value === local.categorySyncId && value !== server.categorySyncId) {
      merged.categoryName = local.categoryName ?? local.categorySyncId;
    }
  }

  const changedLocally = local.amountMinor !== base.amountMinor || local.accountSyncId !== base.accountSyncId;
  const changedRemotely = server.amountMinor !== base.amountMinor || server.accountSyncId !== base.accountSyncId;
  if (changedLocally && changedRemotely
      && (local.amountMinor !== server.amountMinor || local.accountSyncId !== server.accountSyncId)) disputed = true;
  const money = changedLocally && changedRemotely ? selected : changedLocally ? local : server;
  merged.amountMinor = money.amountMinor;
  merged.accountSyncId = money.accountSyncId;
  merged.currencyCode = money.currencyCode ?? (money.accountSyncId === server.accountSyncId ? server.currencyCode : '');
  merged.accountName = money.accountName ?? money.accountSyncId;
  const needsUpload = mergeFields.some((field) => merged[field] !== server[field])
    || merged.amountMinor !== server.amountMinor || merged.accountSyncId !== server.accountSyncId;
  return { merged, disputed, needsUpload };
}
