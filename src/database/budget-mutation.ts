import type { SQLiteDatabase } from 'expo-sqlite';

const listeners = new WeakMap<SQLiteDatabase, () => void>();

export function subscribeToBudgetMutations(database: SQLiteDatabase, listener: () => void) {
  listeners.set(database, listener);
  return () => {
    if (listeners.get(database) === listener) listeners.delete(database);
  };
}

export async function runBudgetMutation(
  database: SQLiteDatabase,
  mutate: Parameters<SQLiteDatabase['withExclusiveTransactionAsync']>[0],
) {
  await database.withExclusiveTransactionAsync(mutate);
  listeners.get(database)?.();
}
