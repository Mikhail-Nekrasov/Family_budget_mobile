import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  View,
  useColorScheme
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AccountCard } from '@/components/accounts/account-card';
import { AccountForm } from '@/components/accounts/account-form';
import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import { getAccounts, getArchivedAccounts } from '@/repositories/account-repository';

type LoadStatus = 'loading' | 'ready' | 'error';

function formatBalance(account: Account, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: account.currencyCode,
  });

  const fractionDigits =
    formatter.resolvedOptions().maximumFractionDigits ?? 2;

  return formatter.format(
    account.balanceMinor / 10 ** fractionDigits,
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

  return (
    <ScreenBackground>
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={styles.screen}
      >
        <View style={styles.toolbar}>
          <AppButton
            title={translations.newAccount}
            rightSymbol="＋"
            disabled={showArchived}
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
                setShowArchived(value === 'archived');
              }}
            />
          </View>
        </View>
        <FlatList
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
          renderItem={({ item }) => (
            <AccountCard
              account={item}
              locale={locale}
              onPress={() => {
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
    gap: 12,
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