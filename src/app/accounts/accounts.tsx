import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  StyleSheet,
  Text,
  View,
  useColorScheme
} from 'react-native';
import ReorderableList, {
  reorderItems,
  useReorderableDrag,
  type ReorderableListReorderEvent,
} from 'react-native-reorderable-list';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AccountCard } from '@/components/accounts/account-card';
import { AccountForm } from '@/components/accounts/account-form';
import { AccountTransferList } from '@/components/accounts/account-transfer-list';
import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import { TransferForm, type TransferSelection } from '@/components/transfers/transfer-form';
import {
  StartupEmptyLayout,
  startupPreloadEnabled,
  useStartupScreenLayout,
} from '@/components/startup-layout';
import { useFocusedList } from '@/hooks/use-focused-list';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import { getAccounts, getArchivedAccounts, saveAccountOrder, } from '@/repositories/account-repository';

type ReorderableAccountCardProps = {
  account: Account;
  locale: string;
  onPress: () => void;
  onLayout?: () => void;
  canReorder: boolean;
};

function ReorderableAccountCard({
  account,
  locale,
  onPress,
  onLayout,
  canReorder,
}: ReorderableAccountCardProps) {
  const drag = useReorderableDrag();

  return (
    <AccountCard
      account={account}
      locale={locale}
      onPress={onPress}
      onLayout={onLayout}
      onLongPress={canReorder ? drag : undefined}
    />
  );
}

export default function AccountsScreen() {
  const database = useSQLiteContext();
  const { locale, translations } = useLanguage();

  const [createVisible, setCreateVisible] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<Account | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);
  const [transfer, setTransfer] = useState<TransferSelection | null>(null);
  const transferVisible = transfer !== null;
  const transferSaving = useRef(false);

  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        background: '#111722',
        card: '#1C2432',
        text: '#F0F3FA',
        muted: '#A8B3C5',
      }
    : {
        background: '#F5F6F9',
        card: '#FFFFFF',
        text: '#192238',
        muted: '#6C7890',
      };

  const [savingOrder, setSavingOrder] = useState(false);
  const savingOrderRef = useRef(false);

  const loadAccounts = useCallback(
    (tab: 'active' | 'archived') =>
      tab === 'archived' ? getArchivedAccounts(database) : getAccounts(database),
    [database],
  );

  const { rows: accounts, status, setRows: setAccounts } = useFocusedList(
    showArchived ? 'archived' : 'active',
    loadAccounts,
    createVisible || transferVisible,
    startupPreloadEnabled,
  );
  const markStartupLayout = useStartupScreenLayout('accounts', status !== 'loading');

  async function handleReorder({
    from,
    to,
  }: ReorderableListReorderEvent) {
    if (
      !reorderMode ||
      from === to ||
      showArchived ||
      status !== 'ready' ||
      savingOrderRef.current
    ) {
      return;
    }

    savingOrderRef.current = true;
    setSavingOrder(true);

    const previousAccounts = accounts;
    const reorderedAccounts = reorderItems(accounts, from, to);

    setAccounts(reorderedAccounts);

    try {
      await saveAccountOrder(
        database,
        reorderedAccounts.map((account) => account.syncId),
      );
    } catch (error) {
      console.warn('Failed to save account order', error);

      setAccounts(previousAccounts);

      Alert.alert(
        translations.error,
        translations.saveAccountOrderError,
      );
    } finally {
      savingOrderRef.current = false;
      setSavingOrder(false);
    }
  }

  const activeAccountsReady = !showArchived && !savingOrder && status === 'ready';
  const hasTransferAccounts = status === 'ready' && accounts.length >= 2;
  const canTransfer = !showArchived && hasTransferAccounts;
  const emptyList = status === 'loading' ? (
    <ActivityIndicator
      accessibilityLabel={translations.loading}
      color={palette.text}
      style={styles.loading}
    />
  ) : (
    <Text style={[styles.message, { color: palette.muted }]}>
      {status === 'error'
        ? translations.loadAccountsError
        : showArchived ? translations.noArchivedAccounts : translations.noAccounts}
    </Text>
  );

  function openAccount(account: Account) {
    if (savingOrderRef.current) return;
    setEditingAccount(account);
    setCreateVisible(true);
  }

  return (
    <ScreenBackground>
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={styles.screen}
      >
        <View style={styles.toolbar}>
          <AppButton
            title={translations.newAccount}
            nativeGlass
            rightSymbol="＋"
            disabled={showArchived}
            onPress={() => {
              if (savingOrderRef.current) return;
              setEditingAccount(null);
              setCreateVisible(true);
            }}
          />
          <View style={styles.accountTabs}>
            <ScreenTabs
              options={[
                {
                  value: 'active',
                  label: translations.activeAccounts,
                },
                {
                  value: 'archived',
                  label: translations.archivedAccounts,
                },
              ]}
              value={showArchived ? 'archived' : 'active'}
              onChange={(value) => {
                if (!savingOrderRef.current) {
                  setReorderMode(false);
                  setShowArchived(value === 'archived');
                }
              }}
            />
          </View>
        </View>
        {reorderMode ? (
          <ReorderableList
            data={accounts}
            keyExtractor={(account) => account.syncId}
            contentContainerStyle={styles.content}
            ListEmptyComponent={emptyList}
            dragEnabled={activeAccountsReady && hasTransferAccounts}
            onReorder={(event) => void handleReorder(event)}
            renderItem={({ item, index }) => (
              <ReorderableAccountCard
                onLayout={index === 0 ? markStartupLayout : undefined}
                account={item}
                locale={locale}
                canReorder={activeAccountsReady && hasTransferAccounts}
                onPress={() => openAccount(item)}
              />
            )}
          />
        ) : (
          <AccountTransferList
            accounts={accounts}
            locale={locale}
            enabled={activeAccountsReady && canTransfer && !createVisible && !transferVisible}
            empty={emptyList}
            contentStyle={styles.content}
            onOpen={openAccount}
            onFirstCardLayout={markStartupLayout}
            onTransfer={(fromId, toId) => {
              if (
                !canTransfer || createVisible || transferVisible ||
                !accounts.some((account) => account.syncId === fromId) ||
                !accounts.some((account) => account.syncId === toId)
              ) {
                return;
              }
              setTransfer({ fromId, toId });
            }}
          />
        )}
        {!accounts.length && <StartupEmptyLayout onLayout={markStartupLayout} />}
        {!showArchived && (
          <View style={styles.footer}>
            <AppButton
              title={translations.newTransfer}
              nativeGlass
              rightSymbol="⇄"
              disabled={!canTransfer || reorderMode}
              onPress={() => {
                if (!savingOrderRef.current) setTransfer({ fromId: null, toId: null });
              }}
            />
            {hasTransferAccounts && (
              <AppButton
                title={reorderMode ? translations.finishReordering : translations.reorderAccounts}
                nativeGlass
                rightIcon={reorderMode ? 'check' : undefined}
                keepTitleCentered
                onPress={() => {
                  if (!savingOrderRef.current) setReorderMode((current) => !current);
                }}
              />
            )}
          </View>
        )}
        <Modal
          visible={transferVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          backdropColor={palette.background}
          onRequestClose={() => {
            if (!transferSaving.current) setTransfer(null);
          }}
        >
          {transfer && (
            <SafeAreaProvider>
              <TransferForm
                accounts={accounts}
                initialSelection={transfer}
                onSavingChange={(saving) => { transferSaving.current = saving; }}
                onSaved={() => setTransfer(null)}
                onCancel={() => setTransfer(null)}
              />
            </SafeAreaProvider>
          )}
        </Modal>
        <Modal
          visible={createVisible}
          animationType="slide"
          presentationStyle="fullScreen"
          backdropColor={dark ? '#111722' : '#F5F6F9'}
          onRequestClose={() => setCreateVisible(false)}
        >
          {createVisible && (
            <SafeAreaProvider>
              <AccountForm
                account={editingAccount ?? undefined}
                onSaved={() => setCreateVisible(false)}
                onCancel={() => setCreateVisible(false)}
              />
            </SafeAreaProvider>
          )}
        </Modal>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  footer: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 8 },
  content: {
    padding: 20,
    gap: 4,
  },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    padding: 16,
    borderRadius: 16,
  },
  accountName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  balance: {
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  loading: {
    marginTop: 24,
  },
  message: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 16,
  },
  toolbar: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  accountIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountTabs: {
    flexDirection: 'row',
    marginTop: 12,
  },
  accountTab: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  accountTabText: {
    fontSize: 15,
    fontWeight: '600',
  },
});