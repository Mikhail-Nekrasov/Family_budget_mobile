import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 5;

export async function initializeDatabase(
  database: SQLiteDatabase,
): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const result = await database.getFirstAsync<{
    user_version: number;
  }>('PRAGMA user_version');

  const currentVersion = result?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error('Local database version is newer than this app supports');
  }

  if (currentVersion === DATABASE_VERSION) {
    return;
  }

  await database.withTransactionAsync(async () => {
    if (currentVersion < 1) {
      await database.execAsync(`
        CREATE TABLE accounts (
          sync_id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          currency_code TEXT NOT NULL,
          icon_key TEXT NOT NULL,
          opening_balance_minor INTEGER NOT NULL,
          balance_minor INTEGER NOT NULL
        );
      `);
    }

    if (currentVersion < 2) {
      await database.execAsync(`
        ALTER TABLE accounts
          ADD COLUMN description TEXT;

        ALTER TABLE accounts
          ADD COLUMN server_id INTEGER;

        ALTER TABLE accounts
          ADD COLUMN server_version INTEGER;
      `);
    }

    if (currentVersion < 3) {
      await database.execAsync(`
        ALTER TABLE accounts
          ADD COLUMN archived_at TEXT;
      `);
    }

    if (currentVersion < 4) {
      await database.execAsync(`
        CREATE TABLE categories (
          sync_id TEXT PRIMARY KEY NOT NULL,
          server_id INTEGER,
          server_version INTEGER,
          name TEXT NOT NULL
            CHECK (length(trim(name)) > 0),
          type TEXT NOT NULL
            CHECK (type IN ('EXPENSE', 'INCOME'))
        );
      `);
    }

    if (currentVersion < 5) {
      await database.execAsync(`
        CREATE TABLE account_order (
          account_sync_id TEXT PRIMARY KEY NOT NULL,
          sort_order INTEGER NOT NULL
            CHECK (sort_order >= 0),

          FOREIGN KEY (account_sync_id)
            REFERENCES accounts(sync_id)
            ON DELETE CASCADE
        );

        INSERT INTO account_order (
          account_sync_id,
          sort_order
        )
        SELECT
          sync_id,
          ROW_NUMBER() OVER (ORDER BY rowid) - 1
        FROM accounts;
      `);
    }

    await database.execAsync(
      `PRAGMA user_version = ${DATABASE_VERSION}`,
    );
  });
}