import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account } from '@/models/account';

export type CreateAccountInput = {
  name: string;
  description: string | null;
  currencyCode: string;
  iconKey: string;
  openingBalanceMinor: number;
};

export type UpdateAccountInput = Pick<
  Account,
  'name' | 'description' | 'iconKey'
>;

const ACCOUNT_COLUMNS = `
  sync_id AS syncId,
  server_id AS serverId,
  server_version AS serverVersion,
  name,
  description,
  currency_code AS currencyCode,
  icon_key AS iconKey,
  opening_balance_minor AS openingBalanceMinor,
  balance_minor AS balanceMinor,
  archived_at AS archivedAt
`;

export async function getAccounts(
  database: SQLiteDatabase,
): Promise<Account[]> {
  return database.getAllAsync<Account>(`
    SELECT ${ACCOUNT_COLUMNS}
    FROM accounts
    WHERE archived_at IS NULL
    ORDER BY name, sync_id
  `);
}

export async function getArchivedAccounts(
  database: SQLiteDatabase,
): Promise<Account[]> {
  return database.getAllAsync<Account>(`
    SELECT ${ACCOUNT_COLUMNS}
    FROM accounts
    WHERE archived_at IS NOT NULL
    ORDER BY archived_at DESC, sync_id
  `);
}

export async function getAccountBySyncId(
  database: SQLiteDatabase,
  syncId: string,
): Promise<Account | null> {
  return database.getFirstAsync<Account>(
    `
      SELECT ${ACCOUNT_COLUMNS}
      FROM accounts
      WHERE sync_id = ?
    `,
    syncId,
  );
}

export async function createAccount(
  database: SQLiteDatabase,
  input: CreateAccountInput,
): Promise<Account> {
  const name = input.name.trim();

  if (name.length === 0) {
    throw new Error('Account name is required');
  }

  if (!Number.isSafeInteger(input.openingBalanceMinor)) {
    throw new Error('Opening balance must be a safe integer');
  }

  const account: Account = {
    syncId: randomUUID(),
    serverId: null,
    serverVersion: null,

    name,
    description: input.description?.trim() || null,

    currencyCode: input.currencyCode,
    iconKey: input.iconKey,

    openingBalanceMinor: input.openingBalanceMinor,
    balanceMinor: input.openingBalanceMinor,

    archivedAt: null,
  };

  await database.runAsync(
    `
      INSERT INTO accounts (
        sync_id,
        server_id,
        server_version,
        name,
        description,
        currency_code,
        icon_key,
        opening_balance_minor,
        balance_minor
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    account.syncId,
    account.serverId,
    account.serverVersion,
    account.name,
    account.description,
    account.currencyCode,
    account.iconKey,
    account.openingBalanceMinor,
    account.balanceMinor,
  );

  return account;
}

export async function updateAccount(
  database: SQLiteDatabase,
  syncId: string,
  input: UpdateAccountInput,
): Promise<void> {
  const name = input.name.trim();

  if (name.length === 0) {
    throw new Error('Account name is required');
  }

  const description = input.description?.trim() || null;

  const result = await database.runAsync(
    `
      UPDATE accounts
      SET
        name = ?,
        description = ?,
        icon_key = ?
      WHERE sync_id = ?
    `,
    name,
    description,
    input.iconKey,
    syncId,
  );

  if (result.changes !== 1) {
    throw new Error('Account not found');
  }
}

export async function archiveAccount(
  database: SQLiteDatabase,
  syncId: string,
): Promise<void> {
  const result = await database.runAsync(
    `
      UPDATE accounts
      SET archived_at = ?
      WHERE sync_id = ?
        AND archived_at IS NULL
    `,
    new Date().toISOString(),
    syncId,
  );

  if (result.changes !== 1) {
    throw new Error('Active account not found');
  }
}

export async function restoreAccount(
  database: SQLiteDatabase,
  syncId: string,
): Promise<void> {
  const result = await database.runAsync(
    `
      UPDATE accounts
      SET archived_at = NULL
      WHERE sync_id = ?
        AND archived_at IS NOT NULL
    `,
    syncId,
  );

  if (result.changes !== 1) {
    throw new Error('Archived account not found');
  }
}

export async function deleteLocalAccount(
  database: SQLiteDatabase,
  syncId: string,
): Promise<void> {
  const result = await database.runAsync(
    `
      DELETE FROM accounts
      WHERE sync_id = ?
        AND server_id IS NULL
    `,
    syncId,
  );

  if (result.changes !== 1) {
    throw new Error(
      'Local account not found or already synchronized',
    );
  }
}
