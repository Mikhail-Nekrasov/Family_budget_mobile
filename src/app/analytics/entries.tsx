import { Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { EntryForm } from '@/components/entries/entry-form';
import { EntryCard } from '@/components/entry-card';
import { ScreenBackground } from '@/components/screen-background';
import { useAnalyticsEntries } from '@/hooks/use-analytics-entries';
import { useLanguage } from '@/hooks/use-language';
import type { Entry } from '@/models/entry';
import type { EntryPeriod } from '@/models/entry-period';
import type { EntryType } from '@/models/entry-type';
import { decodeAnalyticsPeriod } from '@/utils/analytics-period';
import { getCategoryName } from '@/utils/category-name';
import { formatEntryPeriod } from '@/utils/entry-period';
import { getCurrencySymbol } from '@/utils/format-money';
import { currencyFractionDigits } from '@/utils/money';

export default function AnalyticsEntriesRoute() {
  const { translations } = useLanguage();
  const { categoryId, period: rawPeriod, accounts: rawAccounts, type } = useLocalSearchParams<{
    categoryId?: string;
    period?: string;
    accounts?: string;
    type?: string;
  }>();
  const period = useMemo(() => decodeAnalyticsPeriod(rawPeriod), [rawPeriod]);

  const accountIds = useMemo(() => {
    if (rawAccounts === undefined) return [];
    try {
      const values: unknown = JSON.parse(rawAccounts);
      return Array.isArray(values) && values.every((value) => typeof value === 'string' && value.length > 0)
        ? values as string[]
        : null;
    } catch {
      return null;
    }
  }, [rawAccounts]);

  if (!accountIds || !period || typeof categoryId !== 'string' || !categoryId || (type !== 'INCOME' && type !== 'EXPENSE')) {
    return (
      <ScreenBackground>
        <Stack.Screen options={{ title: translations.analytics }} />
        <Text style={styles.empty}>{translations.loadEntriesError}</Text>
      </ScreenBackground>
    );
  }

  return <CategoryEntries categoryId={categoryId} period={period} type={type} accountIds={accountIds} />;
}

function CategoryEntries({ categoryId, period, type, accountIds }: { categoryId: string; period: EntryPeriod; type: EntryType; accountIds: string[] }) {
  const { translations, language, locale } = useLanguage();
  const { data, loading, failed, reload } = useAnalyticsEntries(type, period, categoryId, accountIds);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const dark = useColorScheme() === 'dark';
  const background = dark ? '#111722' : '#F5F6F9';
  const text = dark ? '#F0F3FA' : '#192238';
  const category = data.categories.find((item) => item.syncId === categoryId);
  const accounts = new Map(data.accounts.map((account) => [account.syncId, account]));
  const entries = data.entries.filter((entry) => accounts.has(entry.accountSyncId));
  const income = type === 'INCOME';
  const name = category ? getCategoryName(category, language) : translations.entryCategory;
  const title = translations.analyticsEntriesTitle(name, formatEntryPeriod(period, locale, translations.periodAllTime));

  return (
    <ScreenBackground>
      <Stack.Screen options={{ title: income ? translations.income : translations.expenses }} />
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <FlatList
          data={entries}
          keyExtractor={(entry) => entry.syncId}
          contentContainerStyle={styles.content}
          ListHeaderComponent={<Text accessibilityRole="header" style={[styles.title, { color: text }]}>{title}</Text>}
          ListEmptyComponent={loading ? <ActivityIndicator color={text} /> : (
            <Text style={[styles.empty, { color: text }]}>
              {failed ? translations.loadEntriesError : translations.noEntriesInPeriod}
            </Text>
          )}
          renderItem={({ item }) => {
            const account = accounts.get(item.accountSyncId);
            if (!account) return null;
            const digits = currencyFractionDigits(account.currencyCode);
            const amount = new Intl.NumberFormat(locale, {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
            }).format(item.amountMinor / 10 ** digits);
            const symbol = getCurrencySymbol(account.currencyCode);
            return (
              <EntryCard
                title={item.title}
                accountName={account.name}
                iconKey={account.iconKey}
                iconColor={account.iconColor}
                categoryIconKey={category?.iconKey ?? (income ? 'otherIncome' : 'otherExpense')}
                categoryIconColor={category?.iconColor ?? null}
                categoryName={name}
                amount={amount}
                currencyCode={account.currencyCode}
                currencySymbol={symbol}
                income={income}
                accessibilityLabel={translations.openEntry(item.title)}
                onPress={() => setEditingEntry(item)}
              />
            );
          }}
        />
      </SafeAreaView>
      <Modal
        visible={editingEntry !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        backdropColor={background}
        onRequestClose={() => setEditingEntry(null)}
      >
        {editingEntry && (
          <SafeAreaProvider style={[styles.screen, { backgroundColor: background }]}>
            <EntryForm
              type={editingEntry.type}
              entry={editingEntry}
              onSaved={() => {
                setEditingEntry(null);
                reload();
              }}
              onCancel={() => setEditingEntry(null)}
            />
          </SafeAreaProvider>
        )}
      </Modal>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, gap: 8 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 6 },
  empty: { padding: 16, textAlign: 'center' },
});
