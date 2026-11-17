import type { SQLiteDatabase } from 'expo-sqlite';

// Run inside the schema migration transaction. Existing commands retain their IDs and payloads.
export async function queueExistingLocalData(database: Pick<SQLiteDatabase, 'execAsync'>): Promise<void> {
  await database.execAsync(`
    CREATE INDEX idx_sync_outbox_entity
      ON sync_outbox(entity_type, entity_sync_id, operation);

    WITH local_entities(entity_type, sync_id, payload_json) AS (
      SELECT 'ACCOUNT', sync_id, json_object(
        'syncId', sync_id,
        'name', name,
        'openingBalanceMinor', opening_balance_minor,
        'description', description,
        'currencyCode', currency_code,
        'iconKey', icon_key
      )
      FROM accounts
      WHERE server_id IS NULL

      UNION ALL

      SELECT 'CATEGORY', sync_id, json_object(
        'syncId', sync_id,
        'name', name,
        'type', type,
        'iconKey', icon_key,
        'iconColor', icon_color,
        'defaultKey', default_key,
        'nameOverrides', json(name_overrides_json)
      )
      FROM categories
      WHERE server_id IS NULL

      UNION ALL

      SELECT 'ENTRY', sync_id, json_object(
        'syncId', sync_id,
        'title', title,
        'type', type,
        'amountMinor', amount_minor,
        'dateTime', date_time,
        'description', description,
        'accountSyncId', account_sync_id,
        'categorySyncId', category_sync_id
      )
      FROM entries
      WHERE server_id IS NULL

      UNION ALL

      SELECT 'TRANSFER', sync_id, json_object(
        'syncId', sync_id,
        'fromAccountSyncId', from_account_sync_id,
        'toAccountSyncId', to_account_sync_id,
        'amountMinor', amount_minor,
        'targetAmountMinor', target_amount_minor,
        'sourceCurrencyCode', source_currency_code,
        'targetCurrencyCode', target_currency_code,
        'dateTime', date_time,
        'description', description
      )
      FROM transfers
      WHERE server_id IS NULL
    )
    INSERT INTO sync_outbox (command_id, entity_type, entity_sync_id, operation, payload_json)
    SELECT
      lower(hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-4' ||
        substr(hex(randomblob(2)), 2) || '-' ||
        substr('89ab', (random() & 3) + 1, 1) || substr(hex(randomblob(2)), 2) ||
        '-' || hex(randomblob(6))),
      entity.entity_type, entity.sync_id, 'CREATE', entity.payload_json
    FROM local_entities entity
    WHERE NOT EXISTS (
      SELECT 1 FROM sync_outbox queued
      WHERE queued.entity_type = entity.entity_type
        AND queued.entity_sync_id = entity.sync_id
        AND queued.operation = 'CREATE'
    );
  `);
}
