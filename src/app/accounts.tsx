import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AccountForm } from '@/components/account-form';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import { getAccounts } from '@/repositories/account-repository';

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
          const result = await getAccounts(database);

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
    }, [database, createVisible]),
  );

  async function deleteTestAccounts() {
    try {
      await database.runAsync('DELETE FROM accounts');
      setAccounts([]);
    } catch (error) {
      console.warn('Failed to delete test accounts', error);
      Alert.alert('Error', 'Could not delete test accounts');
    }
  }

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[
        styles.screen,
        { backgroundColor: palette.background },
      ]}
    >
      <View style={styles.toolbar}>
        <Button
          title={translations.newAccount}
          onPress={() => {
            setEditingAccount(null);
            setCreateVisible(true);
          }}
        />
        {__DEV__ && (
          <Button
            title="Delete all local test accounts"
            color="#C62828"
            disabled={status !== 'ready'}
            onPress={() => void deleteTestAccounts()}
          />
        )}
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
                : translations.noAccounts}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setEditingAccount(item);
              setCreateVisible(true);
            }}
            style={[
              styles.account,
              { backgroundColor: palette.card },
            ]}
          >
            <Text
              style={[
                styles.accountName,
                { color: palette.text },
              ]}
            >
              {item.name}
            </Text>

            <Text
              style={[
                styles.balance,
                { color: palette.text },
              ]}
            >
              {formatBalance(item, locale)}
            </Text>
          </Pressable>
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
});