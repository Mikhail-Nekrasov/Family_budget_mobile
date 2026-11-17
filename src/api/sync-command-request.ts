import { isCurrencyCode } from '@/constants/currencies';
import type { PendingSyncCommand } from '@/repositories/sync-outbox-repository';
import { currencyFractionDigits } from '@/utils/money';

type SyncRequestContext = {
  /** Currency of the account referenced in this command's entry payload. */
  entryAccountCurrencyCode?: string;
  /** Zone in which a stored transfer instant should become a server LocalDateTime. */
  transferTimeZone?: string;
};

export type SyncCommandRequest = {
  path: string;
  method: 'POST' | 'PUT';
  body: string;
};

type JsonObject = Record<string, unknown>;
type BodyField = string | number | boolean | null | { decimal: string };

const SYNC_RESOURCE = {
  ACCOUNT: 'accounts',
  CATEGORY: 'categories',
  ENTRY: 'entries',
  TRANSFER: 'transfers',
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const LOCAL_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/;
const UTC_DATE_TIME_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function readObject(value: unknown): JsonObject {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid sync JSON object');
  }
  return value as JsonObject;
}

function readText(object: JsonObject, key: string): string {
  const value = object[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid sync field: ${key}`);
  }
  return value;
}

function readUuid(value: unknown, key: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new Error(`Invalid sync UUID: ${key}`);
  }
  return value.toLowerCase();
}

function readDescription(payload: JsonObject): string | null {
  const value = payload.description;
  if (value !== null && typeof value !== 'string') {
    throw new Error('Invalid sync description');
  }
  return value;
}

function readEntryType(payload: JsonObject): 'EXPENSE' | 'INCOME' {
  if (payload.type !== 'EXPENSE' && payload.type !== 'INCOME') {
    throw new Error('Invalid sync entry type');
  }
  return payload.type;
}

function readInteger(value: unknown, key: string, minimum: number): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`Invalid sync integer: ${key}`);
  }
  return value;
}

function decimalAmount(value: unknown, currency: unknown, minimum: number): { decimal: string } {
  if (typeof currency !== 'string' || !isCurrencyCode(currency)) {
    throw new Error('Missing or unsupported sync currency');
  }

  const minor = readInteger(value, 'amountMinor', minimum);
  const digits = currencyFractionDigits(currency);
  if (digits === 0) {
    return { decimal: String(minor) };
  }

  const magnitude = String(Math.abs(minor)).padStart(digits + 1, '0');
  return {
    decimal: `${minor < 0 ? '-' : ''}${magnitude.slice(0, -digits)}.${magnitude.slice(-digits)}`,
  };
}

function entryDateTime(payload: JsonObject): string {
  const value = readText(payload, 'dateTime');
  const date = new Date(`${value}Z`);
  if (!LOCAL_DATE_TIME_PATTERN.test(value) || !Number.isFinite(date.getTime())
      || date.toISOString() !== `${value}.000Z`) {
    throw new Error('Invalid local entry date and time');
  }
  return value;
}

function transferDateTime(payload: JsonObject, timeZone: string | undefined): string {
  const value = readText(payload, 'dateTime');
  const date = new Date(value);
  if (!UTC_DATE_TIME_PATTERN.test(value) || !Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    throw new Error('Invalid UTC transfer date and time');
  }
  if (!timeZone) {
    throw new Error('Transfer time zone is required');
  }

  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    calendar: 'gregory',
    numberingSystem: 'latn',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
  const local = `${parts.year.padStart(4, '0')}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
  return `${local}${value.slice(19, -1)}`;
}

function request(path: string, method: SyncCommandRequest['method'], fields: Record<string, BodyField>): SyncCommandRequest {
  // Write decimal tokens exactly. Converting through a JS float can lose cents.
  const entries = Object.entries(fields).map(([key, value]) => {
    const token = value !== null && typeof value === 'object' ? value.decimal : JSON.stringify(value);
    return `${JSON.stringify(key)}:${token}`;
  });
  return { path, method, body: `{${entries.join(',')}}` };
}

/** Build the wire request. Senders must keep these exact bytes for retries. */
export function buildSyncCommandRequest(
  command: PendingSyncCommand,
  context: SyncRequestContext = {},
): SyncCommandRequest {
  const { entityType, operation } = command;
  const commandId = readUuid(command.commandId, 'commandId');
  const syncId = readUuid(command.entitySyncId, 'entitySyncId');
  const path = `/api/sync/${SYNC_RESOURCE[entityType]}/${commandId}`;
  const payload = readObject(JSON.parse(command.payloadJson));
  if (readUuid(payload.syncId, 'syncId') !== syncId) {
    throw new Error('Sync payload does not match its entity');
  }

  if (entityType !== 'ACCOUNT' && (operation === 'ARCHIVE' || operation === 'RESTORE')) {
    throw new Error(`Sync API does not support ${entityType} ${operation}`);
  }

  const identity: Record<string, string | number> = { syncId };
  if (operation !== 'CREATE') {
    identity.expectedVersion = readInteger(command.expectedServerVersion, 'expectedVersion', 0);
  }

  if (operation === 'DELETE') {
    return request(`${path}/delete`, 'POST', identity);
  }
  if (operation === 'ARCHIVE' || operation === 'RESTORE') {
    return request(`${path}/archive-state`, 'POST', { ...identity, archived: operation === 'ARCHIVE' });
  }

  const method = operation === 'CREATE' ? 'POST' : 'PUT';
  switch (entityType) {
    case 'ACCOUNT': {
      const fields = {
        ...identity,
        name: readText(payload, 'name'),
        description: readDescription(payload),
        iconKey: readText(payload, 'iconKey'),
      };
      if (operation === 'UPDATE') {
        return request(path, method, fields);
      }
      const currencyCode = readText(payload, 'currencyCode');
      return request(path, method, {
        ...fields,
        currencyCode,
        amount: decimalAmount(payload.openingBalanceMinor, currencyCode, -Number.MAX_SAFE_INTEGER),
      });
    }
    case 'CATEGORY': {
      const fields = { ...identity, name: readText(payload, 'name') };
      return request(path, method, operation === 'CREATE'
        ? { ...fields, type: readEntryType(payload) }
        : fields);
    }
    case 'ENTRY':
      return request(path, method, {
        ...identity,
        title: readText(payload, 'title'),
        type: readEntryType(payload),
        amount: decimalAmount(payload.amountMinor, context.entryAccountCurrencyCode, 1),
        dateTime: entryDateTime(payload),
        description: readDescription(payload),
        accountSyncId: readUuid(payload.accountSyncId, 'accountSyncId'),
        categorySyncId: readUuid(payload.categorySyncId, 'categorySyncId'),
      });
    case 'TRANSFER':
      return request(path, method, {
        ...identity,
        fromAccountSyncId: readUuid(payload.fromAccountSyncId, 'fromAccountSyncId'),
        toAccountSyncId: readUuid(payload.toAccountSyncId, 'toAccountSyncId'),
        amount: decimalAmount(payload.amountMinor, payload.sourceCurrencyCode, 1),
        targetAmount: decimalAmount(payload.targetAmountMinor, payload.targetCurrencyCode, 1),
        dateTime: transferDateTime(payload, context.transferTimeZone),
        description: readDescription(payload),
      });
  }
}

type AccountVersionChange = {
  accountSyncId: string;
  previousVersion: number;
  version: number;
};

export type SyncCommandAcknowledgement = {
  entity?: { id: number; version: number };
  accountVersionChanges: readonly AccountVersionChange[];
};

function readAccountVersionChanges(value: unknown): AccountVersionChange[] {
  // Cached replies from before account versions were included remain valid.
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 4) {
    throw new Error('Invalid account version changes');
  }

  const seen = new Set<string>();
  return value.map((item) => {
    const change = readObject(item);
    const accountSyncId = readUuid(change.accountSyncId, 'accountSyncId');
    const previousVersion = readInteger(change.previousVersion, 'previousVersion', 0);
    const version = readInteger(change.version, 'version', 0);
    if (seen.has(accountSyncId) || version <= previousVersion) {
      throw new Error('Invalid account version transition');
    }
    seen.add(accountSyncId);
    return { accountSyncId, previousVersion, version };
  });
}

export function readSyncCommandResponse(
  command: PendingSyncCommand,
  data: unknown,
): SyncCommandAcknowledgement {
  const response = readObject(data);
  if (readUuid(response.syncId, 'syncId') !== readUuid(command.entitySyncId, 'entitySyncId')) {
    throw new Error('Sync response does not match its entity');
  }
  const accountVersionChanges = readAccountVersionChanges(response.accountVersionChanges);
  if (accountVersionChanges.length && command.entityType !== 'ENTRY' && command.entityType !== 'TRANSFER') {
    throw new Error('Unexpected account version changes');
  }
  if (command.operation === 'DELETE') {
    if (response.deleted !== true) {
      throw new Error('Server did not confirm sync deletion');
    }
    return { accountVersionChanges };
  }

  const id = readInteger(response.id, 'id', 1);
  // PostgreSQL assigned version 0 to pre-versioning transfers, but cached CREATE replies predate it.
  const version = command.entityType === 'TRANSFER' && command.operation === 'CREATE' && response.version === undefined
    ? 0
    : readInteger(response.version, 'version', 0);
  return { entity: { id, version }, accountVersionChanges };
}
