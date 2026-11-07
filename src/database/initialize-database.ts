import { DEFAULT_CATEGORIES } from '@/constants/default-categories';
import {
  ACCOUNT_ICON_COLOR_ROWS,
  defaultCategoryIconColor,
  ICON_COLOR_ROWS,
} from '@/constants/icon-colors';
import { en } from '@/i18n/en';

import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

const DATABASE_VERSION = 19;

// Only used to identify the colors assigned by migration 16.
function legacyCategoryIconColor(key: string, income: boolean): string {
  if (['groceries', 'restaurants', 'health', 'sports'].includes(key)) {
    return key === 'restaurants' ? '#6D9C4C' : '#397B55';
  }
  if (['transport', 'car', 'travel', 'telecom'].includes(key)) return '#307C8A';
  if (['rent', 'utilities', 'household', 'furniture', 'repairs', 'appliances', 'kitchenware'].includes(key)) return '#9B6B20';
  if (['cosmetics', 'clothing', 'gifts', 'family', 'pets', 'charity'].includes(key)) return '#AE536C';
  if (['entertainment', 'hobbies', 'videoGames', 'subscriptions'].includes(key)) return '#7955A3';
  return income ? '#397B55' : '#365BBC';
}

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

    if (currentVersion < 10) {
      await database.execAsync(`
        CREATE TRIGGER prevent_account_delete_with_entries
        BEFORE DELETE ON accounts
        WHEN EXISTS (
          SELECT 1
          FROM entries
          WHERE account_sync_id = OLD.sync_id
        )
        BEGIN
          SELECT RAISE(
            ABORT,
            'Cannot delete an account with entries'
          );
        END;
      `);
    }

    if (currentVersion < 11) {
      await database.execAsync(`
        CREATE TABLE app_preferences (
          id INTEGER PRIMARY KEY NOT NULL
            CHECK (id = 1),

          primary_currency_code TEXT NOT NULL
        );

        INSERT INTO app_preferences (
          id,
          primary_currency_code
        )
        VALUES (1, 'EUR');
      `);
    }

    if (currentVersion < 12) {
      await database.execAsync(`
        CREATE TABLE exchange_rate_snapshot (
          id INTEGER PRIMARY KEY NOT NULL
            CHECK (id = 1),

          payload TEXT NOT NULL
        );
      `);
    }

    if (currentVersion < 13) {
      await database.execAsync(`
        CREATE TABLE historical_exchange_rate (
          requested_date TEXT NOT NULL,
          currency_code TEXT NOT NULL,
          rate REAL NOT NULL CHECK (rate > 0),
          rate_date TEXT NOT NULL,
          fetched_at TEXT NOT NULL,
          checked_at TEXT NOT NULL,
          PRIMARY KEY (requested_date, currency_code)
        );
      `);
    }

    if (currentVersion < 14) {
      await database.execAsync(`
        ALTER TABLE categories ADD COLUMN default_key TEXT;
        ALTER TABLE categories ADD COLUMN name_overrides_json TEXT NOT NULL
          DEFAULT '{}' CHECK (json_valid(name_overrides_json));
        ALTER TABLE categories ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 1000000
          CHECK (sort_order >= 0);

        CREATE UNIQUE INDEX idx_categories_default_key
          ON categories(type, default_key) WHERE default_key IS NOT NULL;

        CREATE TRIGGER prevent_category_delete_with_entries
        BEFORE DELETE ON categories
        WHEN EXISTS (SELECT 1 FROM entries WHERE category_sync_id = OLD.sync_id)
        BEGIN
          SELECT RAISE(ABORT, 'Cannot delete a category with entries');
        END;

        CREATE TRIGGER prevent_category_type_change
        BEFORE UPDATE OF type ON categories
        WHEN NEW.type != OLD.type
        BEGIN
          SELECT RAISE(ABORT, 'Cannot change category type');
        END;
      `);

      for (const definition of DEFAULT_CATEGORIES) {
        await database.runAsync(
          `INSERT INTO categories (
            sync_id, name, type, icon_key, default_key, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          randomUUID(),
          en.defaultCategories[definition.key],
          definition.type,
          definition.iconKey,
          definition.key,
          definition.sortOrder,
        );
      }
    }

    if (currentVersion < 15) {
      await database.execAsync(`
        ALTER TABLE exchange_rate_snapshot ADD COLUMN checked_at TEXT;
      `);
    }

    if (currentVersion < 16) {
      await database.execAsync(`
        ALTER TABLE accounts
        ADD COLUMN icon_color TEXT NOT NULL DEFAULT '#365BBC'
          CHECK (
            length(icon_color) = 7
            AND substr(icon_color, 1, 1) = '#'
            AND substr(icon_color, 2) NOT GLOB '*[^0-9A-Fa-f]*'
          );

        ALTER TABLE categories
        ADD COLUMN icon_color TEXT NOT NULL DEFAULT '#365BBC'
          CHECK (
            length(icon_color) = 7
            AND substr(icon_color, 1, 1) = '#'
            AND substr(icon_color, 2) NOT GLOB '*[^0-9A-Fa-f]*'
          );

        UPDATE categories
        SET icon_color = '#397B55'
        WHERE type = 'INCOME';
      `);

      for (const definition of DEFAULT_CATEGORIES) {
        await database.runAsync(
          'UPDATE categories SET icon_color = ? WHERE default_key = ? AND type = ?',
          legacyCategoryIconColor(definition.key, definition.type === 'INCOME'),
          definition.key,
          definition.type,
        );
      }
    }

    if (currentVersion < 17) {
      for (const table of ['accounts', 'categories'] as const) {
        await database.execAsync(`
          ALTER TABLE ${table} RENAME COLUMN icon_color TO legacy_icon_color;
          ALTER TABLE ${table} ADD COLUMN icon_color TEXT
            CHECK (icon_color IS NULL OR (
              length(icon_color) = 7
              AND substr(icon_color, 1, 1) = '#'
              AND substr(icon_color, 2) NOT GLOB '*[^0-9A-Fa-f]*'
            ));
          UPDATE ${table} SET icon_color = legacy_icon_color;
          ALTER TABLE ${table} DROP COLUMN legacy_icon_color;
        `);
      }

      for (const definition of DEFAULT_CATEGORIES) {
        await database.runAsync(
          `UPDATE categories SET icon_color = ?
           WHERE default_key = ? AND type = ? AND icon_color = ?`,
          defaultCategoryIconColor(definition.key),
          definition.key,
          definition.type,
          legacyCategoryIconColor(definition.key, definition.type === 'INCOME'),
        );
      }
    }

    if (currentVersion < 18) {
      // Match each legacy swatch to its new counterpart in the same position.
      const colorPairs: [string, string][] = ICON_COLOR_ROWS.flatMap(
        (row, rowIndex) => row.map((color, columnIndex): [string, string] => [
          color,
          ACCOUNT_ICON_COLOR_ROWS[rowIndex][columnIndex],
        ]),
      );
      // These swatches were removed from the shared palette in version 17.
      colorPairs.push(
        ['#F9DFCC', ACCOUNT_ICON_COLOR_ROWS[1][1]],
        ['#DC9557', ACCOUNT_ICON_COLOR_ROWS[1][3]],
        ['#C47C36', ACCOUNT_ICON_COLOR_ROWS[1][4]],
        ['#805024', ACCOUNT_ICON_COLOR_ROWS[1][5]],
        ['#F3BE87', ACCOUNT_ICON_COLOR_ROWS[1][2]],
        ['#E9C96D', ACCOUNT_ICON_COLOR_ROWS[2][2]],
        ['#CAA044', ACCOUNT_ICON_COLOR_ROWS[2][3]],
        ['#73364D', ACCOUNT_ICON_COLOR_ROWS[7][5]],
      );

      const cases = colorPairs.map(() => 'WHEN ? THEN ?').join(' ');
      const placeholders = colorPairs.map(() => '?').join(', ');
      await database.runAsync(
        `UPDATE accounts
         SET icon_color = CASE UPPER(icon_color) ${cases} END
         WHERE UPPER(icon_color) IN (${placeholders})`,
        ...colorPairs.flat(),
        ...colorPairs.map(([oldColor]) => oldColor),
      );
    }

    await database.execAsync(
      `PRAGMA user_version = ${DATABASE_VERSION}`,
    );
  });

  if (currentVersion < 19) {
    await database.execAsync(`
      UPDATE categories
      SET icon_key = CASE type
        WHEN 'INCOME' THEN 'otherIncome' ELSE 'otherExpense'
      END
      WHERE icon_key = 'category';

      UPDATE categories SET icon_key = 'rentalIncome'
      WHERE type = 'INCOME' AND default_key = 'rentalIncome'
        AND icon_key = 'housing';

      UPDATE categories SET icon_key = 'giftsIncome'
      WHERE type = 'INCOME' AND default_key = 'giftsIncome'
        AND icon_key = 'gift';
    `);

    for (const definition of DEFAULT_CATEGORIES) {
      if (definition.key !== 'otherExpense' && definition.key !== 'otherIncome') {
        continue;
      }

      await database.runAsync(
        `INSERT INTO categories (
          sync_id, name, type, icon_key, default_key, sort_order, icon_color
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(type, default_key) WHERE default_key IS NOT NULL DO NOTHING`,
        randomUUID(),
        en.defaultCategories[definition.key],
        definition.type,
        definition.iconKey,
        definition.key,
        definition.sortOrder,
        defaultCategoryIconColor(definition.key),
      );
    }
  }
}