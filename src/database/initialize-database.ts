import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 9;

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

    if (currentVersion < 6) {
      await database.execAsync(`
        CREATE TABLE account_order_sync_state (
          id INTEGER PRIMARY KEY NOT NULL
            CHECK (id = 1),

          server_version INTEGER
            CHECK (
              server_version IS NULL
              OR server_version >= 0
            ),

          local_revision INTEGER NOT NULL DEFAULT 0
            CHECK (local_revision >= 0),

          synced_revision INTEGER NOT NULL DEFAULT 0
            CHECK (
              synced_revision >= 0
              AND synced_revision <= local_revision
            )
        );

        INSERT INTO account_order_sync_state (
          id,
          server_version,
          local_revision,
          synced_revision
        )
        SELECT
          1,
          NULL,
          CASE
            WHEN EXISTS (SELECT 1 FROM account_order)
            THEN 1
            ELSE 0
          END,
          0;
      `);
    }

    if (currentVersion < 7) {
      await database.execAsync(`
        ALTER TABLE account_order_sync_state
          ADD COLUMN server_owner_username TEXT;

        CREATE TABLE pending_account_order_command (
          id INTEGER PRIMARY KEY NOT NULL
            CHECK (id = 1),

          command_id TEXT NOT NULL UNIQUE,

          owner_username TEXT NOT NULL
            CHECK (length(trim(owner_username)) > 0),

          local_revision INTEGER NOT NULL
            CHECK (local_revision >= 0),

          expected_version INTEGER NOT NULL
            CHECK (expected_version >= 0),

          request_body TEXT NOT NULL
        );
      `);
    }

    if (currentVersion < 8) {
      await database.execAsync(`
        CREATE TABLE entries (
          sync_id TEXT PRIMARY KEY NOT NULL,
          server_id INTEGER,
          server_version INTEGER,

          title TEXT NOT NULL
            CHECK (length(trim(title)) BETWEEN 1 AND 255),

          type TEXT NOT NULL
            CHECK (type IN ('EXPENSE', 'INCOME')),

          amount_minor INTEGER NOT NULL
            CHECK (
              typeof(amount_minor) = 'integer'
              AND amount_minor > 0
              AND amount_minor <= 9007199254740991
            ),

          date_time TEXT NOT NULL,
          description TEXT,
          account_sync_id TEXT NOT NULL,
          category_sync_id TEXT NOT NULL,

          FOREIGN KEY (account_sync_id)
            REFERENCES accounts(sync_id)
            ON DELETE RESTRICT,

          FOREIGN KEY (category_sync_id)
            REFERENCES categories(sync_id)
            ON DELETE RESTRICT
        );

        CREATE INDEX idx_entries_type_date
          ON entries(type, date_time DESC, sync_id);

        CREATE INDEX idx_entries_account
          ON entries(account_sync_id);

        CREATE INDEX idx_entries_category
          ON entries(category_sync_id);
      `);
    }

    if (currentVersion < 9) {
      await database.execAsync(`
        ALTER TABLE categories
        ADD COLUMN icon_key TEXT NOT NULL DEFAULT 'category';
      `);
    }

    await database.execAsync(
      `PRAGMA user_version = ${DATABASE_VERSION}`,
    );
  });
}