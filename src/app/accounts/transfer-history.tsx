import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { HomeFilters } from '@/components/home-filters';
import { PeriodSelector } from '@/components/periods/period-selector';
import { ScreenBackground } from '@/components/screen-background';
import { TransferForm } from '@/components/transfers/transfer-form';
import { TransferHistoryCard } from '@/components/transfers/transfer-history-card';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import type { EntryPeriod } from '@/models/entry-period';
import type { TransferHistoryItem } from '@/models/transfer';
import { getAccounts, getArchivedAccounts } from '@/repositories/account-repository';
import { getTransferHistory } from '@/repositories/transfer-repository';
import { formatEntryPeriod, periodBounds } from '@/utils/entry-period';

const ALL_TIME: EntryPeriod = { kind: 'all' };

export default function TransferHistoryScreen() {
  const database = useSQLiteContext();
  const { locale, translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const [query, setQuery] = useState<{ period: EntryPeriod; accountIds: string[] }>({
    period: ALL_TIME,
    accountIds: [],
  });
  const { period, accountIds } = query;
  const [periodVisible, setPeriodVisible] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [editingTransfer, setEditingTransfer] = useState<TransferHistoryItem | null>(null);
  const saving = useRef(false);
  const requestId = useRef(0);
  const [transfers, setTransfers] = useState<TransferHistoryItem[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const palette = dark
    ? { card: '#1C2432', text: '#F0F3FA', muted: '#A8B3C5', line: '#333F52', accent: '#A0B8FF' }
    : { card: '#FFFFFF', text: '#192238', muted: '#6C7890', line: '#E0E5EE', accent: '#365BBC' };

  const loadTransfers = useCallback(async () => {
    const request = ++requestId.current;
    setStatus('loading');

    try {
      const [rows, current, archived] = await Promise.all([
        getTransferHistory(database, {
          ...periodBounds(query.period),
          accountSyncIds: query.accountIds,
        }),
        getAccounts(database),
        getArchivedAccounts(database),
      ]);
      if (request !== requestId.current) return;

      setTransfers(rows);
      setAccounts([...current, ...archived]);
      setStatus('ready');
    } catch (error) {
      console.warn('Failed to load transfer history', error);
      if (request !== requestId.current) return;

      setTransfers([]);
      setStatus('error');
    }
  }, [database, query]);

  useFocusEffect(useCallback(() => {
    void loadTransfers();
    return () => { requestId.current += 1; };
  }, [loadTransfers]));

  function setPeriod(next: EntryPeriod) {
    setQuery((current) => ({ ...current, period: next }));
  }

  return (
    <ScreenBackground>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <View style={styles.filters}>
          <HomeFilters
            accountIds={accountIds}
            accountOptions={accounts.map((account) => ({ id: account.syncId, name: account.name }))}
            onAccountsChange={(ids) => setQuery((current) => ({ ...current, accountIds: ids }))}
            periodFilter={{
              label: formatEntryPeriod(period, locale, translations.periodAllTime),
              active: period.kind !== 'all',
              onPress: () => setPeriodVisible(true),
              onReset: () => setPeriod(ALL_TIME),
            }}
            palette={palette}
          />
        </View>
        <FlatList
          data={status === 'ready' ? transfers : []}
          keyExtractor={(transfer) => transfer.syncId}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TransferHistoryCard
              transfer={item}
              onPress={() => setEditingTransfer(item)}
            />
          )}
          ListEmptyComponent={status === 'loading' ? (
            <ActivityIndicator
              accessibilityLabel={translations.loading}
              color={palette.accent}
              style={styles.loading}
            />
          ) : (
            <Text style={[styles.message, { color: palette.muted }]}>
              {status === 'error' ? translations.loadTransfersError : translations.noTransfersInPeriod}
            </Text>
          )}
        />
        <PeriodSelector
          visible={periodVisible}
          value={period}
          type="TRANSFER"
          onApply={(next) => {
            setPeriod(next);
            setPeriodVisible(false);
          }}
          onCancel={() => setPeriodVisible(false)}
        />
        <Modal
          visible={editingTransfer !== null}
          animationType="slide"
          presentationStyle="fullScreen"
          backdropColor={dark ? '#111722' : '#F5F6F9'}
          onRequestClose={() => {
            if (!saving.current) setEditingTransfer(null);
          }}
        >
          {editingTransfer && (
            <SafeAreaProvider style={{ flex: 1, backgroundColor: dark ? '#111722' : '#F5F6F9' }}>
              <TransferForm
                accounts={accounts}
                transfer={editingTransfer}
                initialSelection={{
                  fromId: editingTransfer.fromAccountSyncId,
                  toId: editingTransfer.toAccountSyncId,
                }}
                onSavingChange={(value) => { saving.current = value; }}
                onSaved={async () => {
                  await loadTransfers();
                  setEditingTransfer(null);
                }}
                onCancel={() => setEditingTransfer(null)}
              />
            </SafeAreaProvider>
          )}
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  filters: { paddingHorizontal: 20, paddingTop: 4 },
  content: { padding: 20, gap: 10 },
  loading: { marginTop: 24 },
  message: { marginTop: 24, textAlign: 'center', fontSize: 16 },
});
