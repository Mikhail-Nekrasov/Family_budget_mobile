import { useFocusEffect } from 'expo-router';
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
import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import { getAccounts, getArchivedAccounts, saveAccountOrder, } from '@/repositories/account-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

type ReorderableAccountCardProps = {
  account: Account;
  locale: string;
  onPress: () => void;
  canReorder: boolean;
};

function ReorderableAccountCard({
  account,
  locale,
  onPress,
  canReorder,
}: ReorderableAccountCardProps) {
  const drag = useReorderableDrag();

  return (
    <AccountCard
      account={account}
      locale={locale}
      onPress={onPress}
      onLongPress={canReorder ? drag : undefined}
    />
  );
}

export default function AccountsScreen() {
  const database = useSQLiteContext();
  const { locale, translations } = useLanguage();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [createVisible, setCreateVisible] = useState(false);
  const [editingAccount, setEditingAccount] =
    useState<Account | null>(null);
  const [showArchived, setShowArchived] = useState(false);

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

  useFocusEffect(
    useCallback(() => {
      if (createVisible) {
        return;
      }

      let active = true;

      async function loadAccounts() {
        setStatus('loading');

        try {
          const result = showArchived
            ? await getArchivedAccounts(database)
            : await getAccounts(database);

          if (active) {
            setAccounts(result);
            setStatus('ready');
          }
        } catch (error) {
          console.warn('Failed to load accounts', error);

          if (active) {
            setStatus('error');
          }
        }
      }

      void loadAccounts();

      return () => {
        active = false;
      };
    }, [database, createVisible, showArchived]),
  );

  async function handleReorder({
    from,
    to,
  }: ReorderableListReorderEvent) {
    if (
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
            disabled={showArchived || savingOrder}
            onPress={() => {
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
                  setShowArchived(value === 'archived');
                }
              }}
            />
          </View>
        </View>
        <ReorderableList
          data={status === 'ready' ? accounts : []}
          keyExtractor={(account) => account.syncId}
          contentContainerStyle={styles.content}
          ListEmptyComponent={
            status === 'loading' ? (
              <ActivityIndicator
                accessibilityLabel={translations.loading}
                color={palette.text}
                style={styles.loading}
              />
            ) : (
              <Text
                style={[
                  styles.message,
                  { color: palette.muted },
                ]}
              >
                {status === 'error'
                  ? translations.loadAccountsError
                  : showArchived
                    ? translations.noArchivedAccounts
                    : translations.noAccounts}
              </Text>
            )
          }
          dragEnabled={
            !showArchived &&
            !savingOrder &&
            status === 'ready'
          }
          onReorder={(event) => void handleReorder(event)}
          renderItem={({ item }) => (
            <ReorderableAccountCard
              account={item}
              locale={locale}
              canReorder={!showArchived && !savingOrder}
              onPress={() => {
                if (savingOrderRef.current) {
                  return;
                }

                setEditingAccount(item);
                setCreateVisible(true);
              }}
            />
          )}
        />
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