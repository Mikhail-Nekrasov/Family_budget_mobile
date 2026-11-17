import { createContext, useContext } from 'react';
import type { SyncConflict } from '@/services/pending-sync-conflicts';

export const BudgetDownloadRevision = createContext(0);

export function useBudgetDownloadRevision() {
  return useContext(BudgetDownloadRevision);
}

export type BudgetSyncPhase =
  | 'waiting' | 'offline' | 'uploading' | 'downloading' | 'synced'
  | 'legacy' | 'pending' | 'conflict' | 'retrying' | 'failed';

export const BudgetSyncStatus = createContext<{
  phase: BudgetSyncPhase;
  checkedAt: number | null;
  refresh: () => void;
  conflicts: SyncConflict[];
  resolveConflict: (conflict: SyncConflict, choice: 'local' | 'server') => Promise<void>;
}>({
  phase: 'waiting',
  checkedAt: null,
  refresh: () => undefined,
  conflicts: [],
  resolveConflict: async () => undefined,
});

export function useBudgetSyncStatus() {
  return useContext(BudgetSyncStatus);
}
