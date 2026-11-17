const appearance = {
  accounts: { entity: 'account', fields: { icon_color: 'color', is_hidden: 'hidden' } },
  categories: { entity: 'category', fields: { icon_color: 'color', icon_key: 'icon' } },
};

export const budgetPreferencesSchema = `
  CREATE TABLE budget_preferences_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    remote_json TEXT,
    applying INTEGER NOT NULL DEFAULT 0,
    conflicts_json TEXT NOT NULL DEFAULT '[]'
  );
  INSERT INTO budget_preferences_state (id) VALUES (1);
  CREATE TABLE budget_preferences_dirty (
    key TEXT PRIMARY KEY,
    token TEXT NOT NULL
  );
  ${Object.entries(appearance).flatMap(([table, { entity, fields }]) =>
    Object.entries(fields).flatMap(([column, field]) =>
      ['insert', 'update'].map((action) => `
        CREATE TRIGGER preference_${table}_${column}_${action}
        AFTER ${action === 'insert' ? 'INSERT' : `UPDATE OF ${column}`} ON ${table}
        WHEN (SELECT applying FROM budget_preferences_state WHERE id = 1) = 0
          AND ${action === 'insert' ? 'NEW.server_id IS NULL' : `NEW.${column} IS NOT OLD.${column}`}
        BEGIN
          INSERT INTO budget_preferences_dirty (key, token)
          VALUES ('${entity}:' || NEW.sync_id || ':${field}', lower(hex(randomblob(16))))
          ON CONFLICT(key) DO UPDATE SET token = excluded.token;
        END;
      `),
    ),
  ).join('\n')}
`;
