import { CategoryChart, type ChartSegment } from '@/components/category-chart';
import { EntryForm } from '@/components/entries/entry-form';
import { EntryCard } from '@/components/entry-card';
import { HomeFilters } from '@/components/home-filters';
import { MenuButton } from '@/components/menu-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import type { Category } from '@/models/category';
import type { Entry } from '@/models/entry';
import type { EntryType } from '@/models/entry-type';
import type { ExchangeRateSnapshot } from '@/models/exchange-rate-snapshot';
import {
  getAccounts,
  getArchivedAccounts,
} from '@/repositories/account-repository';
import { getCategories } from '@/repositories/category-repository';
import { getEntries } from '@/repositories/entry-repository';
import { getExchangeRateSnapshot } from '@/repositories/exchange-rate-repository';
import { getPrimaryCurrency } from '@/repositories/preferences-repository';
import { convertAmountMinor } from '@/services/currency-conversion-service';
import { refreshExchangeRates } from '@/services/exchange-rate-service';

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { translations, locale } = useLanguage();
  const [type, setType] = useState<EntryType>('EXPENSE');
  const [period, setPeriod] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [createVisible, setCreateVisible] = useState(false);

  const database = useSQLiteContext();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [primaryCurrency, setPrimaryCurrency] = useState('EUR');

  const [exchangeRates, setExchangeRates] =
    useState<ExchangeRateSnapshot | null>(null);

  const [status, setStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');

  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const palette = dark
    ? { background: '#111722', card: '#1C2432', text: '#F0F3FA', muted: '#A8B3C5', line: '#333F52', accent: '#A0B8FF', icon: '#29354B' }
    : { background: '#F5F6F9', card: '#FFFFFF', text: '#192238', muted: '#6C7890', line: '#E0E5EE', accent: '#365BBC', icon: '#EAF0FC' };


  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(period);

  useEffect(() => {
    let active = true;

    async function refreshRates() {
      try {
        const snapshot = await refreshExchangeRates(database);

        if (active && snapshot) {
          setExchangeRates((current) => {
            if (
              current &&
              Date.parse(current.fetchedAt) >
                Date.parse(snapshot.fetchedAt)
            ) {
              return current;
            }

            return snapshot;
          });
        }
      } catch (error) {
        console.warn('Failed to read exchange rate cache', error);
      }
    }

    void refreshRates();

    return () => {
      active = false;
    };
  }, [database]);

  useFocusEffect(
    useCallback(() => {
      if (createVisible) {
        return;
      }

      let active = true;

      async function loadHome() {
        setStatus('loading');

        const from = new Date(
          period.getFullYear(),
          period.getMonth(),
          1,
        );

        const to = new Date(
          period.getFullYear(),
          period.getMonth() + 1,
          1,
        );

        try {
          const [
            activeAccounts,
            archivedAccounts,
            loadedCategories,
            loadedEntries,
            loadedCurrency,
            cachedRates,
          ] = await Promise.all([
            getAccounts(database),
            getArchivedAccounts(database),
            getCategories(database, type),
            getEntries(database, {
              type,
              from,
              to,
              accountSyncIds: accountIds,
              categorySyncIds: categoryIds,
            }),
            getPrimaryCurrency(database),
            getExchangeRateSnapshot(database),
          ]);

          if (!active) {
            return;
          }

          setPrimaryCurrency(loadedCurrency);

          if (cachedRates) {
            setExchangeRates((current) => {
              if (
                current &&
                Date.parse(current.fetchedAt) >
                  Date.parse(cachedRates.fetchedAt)
              ) {
                return current;
              }

              return cachedRates;
            });
          }

          setAccounts([
            ...activeAccounts,
            ...archivedAccounts,
          ]);
          setCategories(loadedCategories);
          setEntries(loadedEntries);
          setStatus('ready');
        } catch (error) {
          console.warn('Failed to load home data', error);

          if (active) {
            setEntries([]);
            setStatus('error');
          }
        }
      }

      void loadHome();

      return () => {
        active = false;
      };
    }, [
      database,
      type,
      period,
      accountIds,
      categoryIds,
      createVisible,
    ]),
  );

  const accountsById = new Map(
    accounts.map((account) => [account.syncId, account]),
  );

  const chartCurrencyCode = primaryCurrency;

  const categoryTotals = new Map<string, number>();

  let conversionIncomplete = false;

  for (const entry of entries) {
    const account = accountsById.get(entry.accountSyncId);

    if (!account) {
      conversionIncomplete = true;
      continue;
    }

    const convertedAmount = convertAmountMinor(
      entry.amountMinor,
      account.currencyCode,
      primaryCurrency,
      exchangeRates,
    );

    if (convertedAmount === null) {
      conversionIncomplete = true;
      continue;
    }

    const total =
      (categoryTotals.get(entry.categorySyncId) ?? 0) +
      convertedAmount;

    if (!Number.isSafeInteger(total)) {
      conversionIncomplete = true;
      continue;
    }

    categoryTotals.set(entry.categorySyncId, total);
  }

  const chartColors = [
    '#6488E8',
    '#E7A45B',
    '#65B79A',
    '#B58AD9',
    '#DE7D94',
    '#65B7CE',
    '#A6B85D',
    '#BD9275',
  ];

  const segments: ChartSegment[] = categories
    .map((category) => {
      let hash = 0;

      for (const character of category.syncId) {
        hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
      }

      return {
        id: category.syncId,
        name: category.name,
        color: chartColors[hash % chartColors.length],
        amountMinor: categoryTotals.get(category.syncId) ?? 0,
      };
    })
    .filter((segment) => segment.amountMinor > 0);

  function formatEntryAmount(
    amountMinor: number,
    currencyCode: string,
  ): string {
    const fractionDigits = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits ?? 2;

    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(amountMinor / 10 ** fractionDigits);
  }

  function changeMonth(direction: number) {
    setPeriod((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1));
  }

  return (
    <ScreenBackground>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.screen}
      >
        <View style={styles.tabs}>
          <MenuButton />

          <ScreenTabs<EntryType>
            options={[
              {
                value: 'EXPENSE',
                label: translations.expenses,
              },
              {
                value: 'INCOME',
                label: translations.income,
              },
            ]}
            value={type}
            onChange={(value) => {
              setType(value);
              setCategoryIds([]);
            }}
          />
        </View>

        <FlatList
          data={
            status === 'ready'
              ? entries.filter((entry) =>
                  accountsById.has(entry.accountSyncId),
                )
              : []
          }
          keyExtractor={(entry) => entry.syncId}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          ListHeaderComponent={<View style={styles.header}>
            <View style={styles.period}>
              <Pressable onPress={() => changeMonth(-1)} accessibilityRole="button" accessibilityLabel={translations.previousMonth} style={styles.arrow}>
                <Text style={[styles.arrowText, { color: palette.text }]}>‹</Text>
              </Pressable>
              <Text style={[styles.periodText, { color: palette.text }]}>{monthLabel}</Text>
              <Pressable onPress={() => changeMonth(1)} accessibilityRole="button" accessibilityLabel={translations.nextMonth} style={styles.arrow}>
                <Text style={[styles.arrowText, { color: palette.text }]}>›</Text>
              </Pressable>
            </View>
            <View style={styles.chartPanel}>
              {status === 'ready' && conversionIncomplete ? (
                <Text
                  style={[
                    styles.empty,
                    { color: palette.muted },
                  ]}
                >
                  {translations.conversionUnavailable}
                </Text>
              ) : (
                <>
                  <CategoryChart
                    segments={status === 'ready' ? segments : []}
                    label={
                      type === 'EXPENSE'
                        ? translations.totalExpenses
                        : translations.totalIncome
                    }
                    currencyCode={chartCurrencyCode}
                    textColor={palette.text}
                    mutedColor={palette.muted}
                    trackColor={palette.line}
                  />
                </>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  type === 'EXPENSE'
                    ? translations.addExpense
                    : translations.addIncome
                }
                onPress={() => setCreateVisible(true)}
                style={[
                  styles.addButton,
                  { backgroundColor: palette.accent },
                ]}
              >
                <Text
                  style={[
                    styles.addText,
                    { color: palette.background },
                  ]}
                >
                  ＋
                </Text>
              </Pressable>
            </View>
            <HomeFilters accountIds={accountIds} categoryIds={categoryIds}
              onAccountsChange={setAccountIds} onCategoriesChange={setCategoryIds}
              accountOptions={accounts.map((account) => ({
                id: account.syncId,
                name: `${account.name} · ${account.currencyCode}`,
              }))}
              categoryOptions={categories.map((category) => ({
                id: category.syncId,
                name: category.name,
              }))}
              palette={palette} />
          </View>}
          ListEmptyComponent={
            status === 'loading' ? (
              <ActivityIndicator
                color={palette.text}
                accessibilityLabel={translations.loading}
                style={{ paddingVertical: 28 }}
              />
            ) : (
              <Text
                style={[
                  styles.empty,
                  { color: palette.muted },
                ]}
              >
                {status === 'error'
                  ? translations.loadEntriesError
                  : translations.noEntries}
              </Text>
            )
          }
          renderItem={({ item }) => {
            const account = accountsById.get(
              item.accountSyncId,
            );

            if (!account) {
              return null;
            }

            return (
              <EntryCard
                title={item.title}
                accountName={account.name}
                iconKey={account.iconKey}
                amount={formatEntryAmount(
                  item.amountMinor,
                  account.currencyCode,
                )}
                currencyCode={account.currencyCode}
                currencySymbol={account.currencyCode}
                income={item.type === 'INCOME'}
                accessibilityLabel={
                  translations.openEntry(item.title)
                }
                onPress={() =>
                  Alert.alert(
                    item.title,
                    translations.editEntryPlaceholder(
                      item.syncId,
                    ),
                  )
                }
              />
            );
          }
        } />
      </SafeAreaView>

      <Modal
        visible={createVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        backdropColor={palette.background}
        onRequestClose={() => setCreateVisible(false)}
      >
        {createVisible && (
          <SafeAreaProvider
            style={{
              flex: 1,
              backgroundColor: palette.background,
            }}
          >
            <EntryForm
              type={type}
              onSaved={() => setCreateVisible(false)}
              onCancel={() => setCreateVisible(false)}
            />
          </SafeAreaProvider>
        )}
      </Modal>

    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  content: {
    paddingHorizontal: 20,
    gap: 10
  },
  chartPanel: {
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 2
  },
  addButton: { position: 'absolute', right: 0, bottom: 8, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 30, lineHeight: 36 },
  header: { paddingBottom: 12 },
  period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 },
  periodText: { fontSize: 16, fontWeight: '600', textTransform: 'capitalize' },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32 },
  
  currency: { fontSize: 16 },
  empty: { textAlign: 'center', paddingVertical: 28, fontSize: 15 },
});
