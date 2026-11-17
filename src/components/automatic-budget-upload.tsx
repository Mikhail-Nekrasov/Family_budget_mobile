import { listPreferenceConflicts, resolvePreferenceConflict, syncBudgetPreferences } from '@/services/budget-preferences';
import { usePathname, useRouter } from 'expo-router';
import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Alert, AppState } from 'react-native';

import { ApiError } from '@/api/api-error';
import { useLanguage } from '@/hooks/use-language';
import { syncPageText } from '@/i18n/sync-page-text';
import { useBudgetAuth } from '@/components/budget-auth';
import { subscribeToBudgetMutations } from '@/database/budget-mutation';
import { BudgetDownloadRevision, BudgetSyncStatus, type BudgetSyncPhase } from '@/hooks/use-budget-download-revision';
import { EntryConflictChangedError, resolveEntrySyncConflict } from '@/repositories/entry-repository';
import { BudgetConflictChangedError, resolveBudgetEntityConflict } from '@/services/budget-entity-conflict';
import { clearSyncConflict, isConflictServerVersionCurrent, listSyncConflicts, syncConflictId, type SyncConflict } from '@/services/pending-sync-conflicts';
import { createBudgetUploadScheduler } from '@/services/budget-upload-scheduler';
import { downloadProfileBudgetChanges } from '@/services/initialize-profile-budget';
import { getBudgetUploadState, uploadBudgetChanges } from '@/services/upload-budget-changes';

const NO_CONFLICTS: SyncConflict[] = [];

export function AutomaticBudgetUpload({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const router = useRouter();
  const pathname = usePathname();
  const { language } = useLanguage();
  const notified = useRef(new Set<string>());
  const { user, needsSignIn, withBudgetSession } = useBudgetAuth();
  const userId = user?.userId;
  const wakeSync = useRef<(() => void) | null>(null);
  const refresh = useCallback(() => wakeSync.current?.(), []);
  const [pending, setPending] = useState<{ userId: string; conflicts: SyncConflict[] } | null>(null);
  const resolveSelection = useRef<((conflict: SyncConflict, choice: 'local' | 'server') => Promise<void>) | null>(null);
  const resolveConflict = useCallback(async (conflict: SyncConflict, choice: 'local' | 'server') => {
    if (!resolveSelection.current) throw new Error('The conflict is no longer available');
    await resolveSelection.current(conflict, choice);
  }, []);
  const [downloadRevision, setDownloadRevision] = useState(0);
  const [syncStatus, setSyncStatus] = useState<{ phase: BudgetSyncPhase; checkedAt: number | null }>({
    phase: 'waiting', checkedAt: null,
  });

  useEffect(() => {
    if (!userId || needsSignIn) return;
    const conflictUserId = userId;
    let active = true;
    let foreground = AppState.currentState == null || AppState.currentState === 'active';
    let online = false;
    let receivedNetworkEvent = false;
    let resolving = false;
    let stoppedPhase: BudgetSyncPhase | undefined;

    async function reloadConflicts() {
      const conflicts: SyncConflict[] = [...await listSyncConflicts(database), ...await listPreferenceConflicts(database)];
      if (active) setPending({ userId: conflictUserId, conflicts });
      return conflicts;
    }

    void reloadConflicts().catch(() => undefined);

    function showPhase(phase: BudgetSyncPhase) {
      if (!active) return;
      if (phase === 'legacy' || phase === 'failed') stoppedPhase = phase;
      setSyncStatus((previous) => ({
        phase, checkedAt: phase === 'synced' ? Date.now() : previous.checkedAt,
      }));
    }

    const scheduler = createBudgetUploadScheduler(async () => {
      const state = await getBudgetUploadState(database);
      function connected() {
        return active && foreground && online;
      }
      if (!connected() || resolving) return 'complete';
      if (state === 'blocked') {
        showPhase('legacy');
        return 'blocked';
      }

      showPhase(state === 'ready' ? 'uploading' : 'downloading');
      return withBudgetSession(userId, async (headers) => {

        if (state === 'ready') {
          const result = await uploadBudgetChanges(database, headers, connected, () => {
            if (active) setDownloadRevision((value) => value + 1);
          });
          if (result === 'blocked') showPhase('failed');
          if (result !== 'complete') {
            await reloadConflicts();
            return result;
          }
        }
        if (!connected()) return 'complete';

        showPhase('downloading');
        if (await downloadProfileBudgetChanges(database, headers) && active) {
          setDownloadRevision((value) => value + 1);
        }
        if (connected()) {
          if (await syncBudgetPreferences(database, headers) && active) {
            setDownloadRevision((value) => value + 1);
          }
          const hasConflicts = (await reloadConflicts()).length > 0;
          const afterDownload = await getBudgetUploadState(database);
          showPhase(hasConflicts ? 'conflict' : afterDownload === 'idle' ? 'synced' : 'pending');
          return !hasConflicts && afterDownload === 'ready' ? 'more' : 'complete';
        }
        return 'complete';
      });
    }, (error) => {
      if (!online) {
        showPhase('offline');
        return true;
      }
      void reloadConflicts().catch(() => undefined);
      if (error instanceof ApiError && error.status === 409) {
        showPhase('conflict');
        return false;
      }
      const retry = !(error instanceof ApiError)
        || error.status === 408 || error.status === 429 || error.status >= 500;
      showPhase(retry ? 'retrying' : 'failed');
      return retry;
    });

    resolveSelection.current = async (conflict, choice) => {
      if (!active || resolving || !online || !foreground) {
        throw new Error('Connect to the server before resolving a conflict');
      }
      resolving = true;
      try {
        const id = syncConflictId(conflict);
        await withBudgetSession(conflictUserId, async (headers) => {
          if ('kind' in conflict) {
            await resolvePreferenceConflict(database, conflict, choice, headers);
            if (active) setDownloadRevision((value) => value + 1);
            return;
          }
          if (!await isConflictServerVersionCurrent(conflict, headers)) {
            await clearSyncConflict(database, id);
            return;
          }
          try {
            if ('entity' in conflict) await resolveBudgetEntityConflict(database, conflict, choice);
            else await resolveEntrySyncConflict(database, conflict, choice);
            if (active) setDownloadRevision((value) => value + 1);
          } catch (error) {
            if (!(error instanceof EntryConflictChangedError || error instanceof BudgetConflictChangedError)) throw error;
            // Keep the operation and let its next attempt refresh the comparison.
            await clearSyncConflict(database, id);
          }
        });
        await reloadConflicts();
        stoppedPhase = undefined;
        scheduler.resume();
        scheduler.wake();
      } finally {
        resolving = false;
      }
    };

    function updateNetwork(connected: boolean | undefined, reachable: boolean | undefined) {
      online = connected !== false && reachable !== false;
      if (!online) showPhase('offline');
      else if (stoppedPhase) showPhase(stoppedPhase);
      scheduler.setAvailable(foreground && online);
    }

    const network = addNetworkStateListener((state) => {
      receivedNetworkEvent = true;
      updateNetwork(state.isConnected, state.isInternetReachable);
    });
    void getNetworkStateAsync().then((state) => {
      if (!active || receivedNetworkEvent) return;
      updateNetwork(state.isConnected, state.isInternetReachable);
    }).catch(() => undefined);

    const app = AppState.addEventListener('change', (state) => {
      foreground = state === 'active';
      scheduler.setAvailable(foreground && online);
    });
    const unsubscribe = subscribeToBudgetMutations(database, scheduler.wake);
    wakeSync.current = scheduler.wake;

    return () => {
      active = false;
      scheduler.dispose();
      wakeSync.current = null;
      resolveSelection.current = null;
      unsubscribe();
      app.remove();
      network.remove();
    };
  }, [database, needsSignIn, userId, withBudgetSession]);

  const conflicts = !needsSignIn && pending && pending.userId === userId ? pending.conflicts : NO_CONFLICTS;
  useEffect(() => {
    if (syncStatus.phase !== 'conflict' || !conflicts.length || pathname === '/settings/synchronization') return;
    const ids = conflicts.map(syncConflictId);
    if (ids.every((id) => notified.current.has(id))) return;
    for (const id of ids) notified.current.add(id);
    const text = syncPageText[language];
    Alert.alert(text.alertTitle, text.alertBody, [
      { text: text.later, style: 'cancel' },
      { text: text.resolve, onPress: () => router.push('/settings/synchronization') },
    ]);
  }, [conflicts, language, pathname, router, syncStatus.phase]);

  return (
    <BudgetSyncStatus.Provider value={{
      ...syncStatus,
      refresh,
      conflicts,
      resolveConflict,
    }}>
      <BudgetDownloadRevision.Provider value={downloadRevision}>{children}</BudgetDownloadRevision.Provider>
    </BudgetSyncStatus.Provider>
  );
}
