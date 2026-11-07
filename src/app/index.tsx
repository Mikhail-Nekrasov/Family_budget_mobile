import { CategoryChart, type ChartSegment } from '@/components/category-chart';
import { EntryForm } from '@/components/entries/entry-form';
import { EntryCard } from '@/components/entry-card';
import { HomeFilters } from '@/components/home-filters';
import { MenuButton } from '@/components/menu-button';
import { PeriodSelector } from '@/components/periods/period-selector';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import { getOtherCategoryIconKey } from '@/constants/category-icons';
import { useEntryConversion } from '@/hooks/use-entry-conversion';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import type { Category } from '@/models/category';
import type { Entry } from '@/models/entry';
import type { EntryPeriod } from '@/models/entry-period';
import type { EntryType } from '@/models/entry-type';
import { getAccounts, getArchivedAccounts } from '@/repositories/account-repository';
import { getCategories } from '@/repositories/category-repository';
import { getEntries } from '@/repositories/entry-repository';
import { getPrimaryCurrency } from '@/repositories/preferences-repository';
import { getCategoryName } from '@/utils/category-name';
import {
  currentMonthPeriod,
  formatEntryPeriod,
  periodBounds,
  shiftPeriod
} from '@/utils/entry-period';
import { getCurrencySymbol } from '@/utils/format-money';

import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
  useWindowDimensions
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets
} from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { translations, locale, language } = useLanguage();
  const [type, setType] = useState<EntryType>('EXPENSE');
  const [period, setPeriod] = useState<EntryPeriod>(() => currentMonthPeriod());
  const [periodVisible, setPeriodVisible] = useState(false);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [createVisible, setCreateVisible] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);

  const database = useSQLiteContext();

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [primaryCurrency, setPrimaryCurrency] = useState('EUR');


  const [status, setStatus] = useState<
    'loading' | 'ready' | 'error'
  >('loading');

  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const chartSize = Math.min(240, Math.max(80, width - insets.left - insets.right - 40 - 112));
  const palette = dark
    ? { background: '#111722', card: '#1C2432', text: '#F0F3FA', muted: '#A8B3C5', line: '#333F52', accent: '#A0B8FF', icon: '#29354B' }
    : { background: '#F5F6F9', card: '#FFFFFF', text: '#192238', muted: '#6C7890', line: '#E0E5EE', accent: '#365BBC', icon: '#EAF0FC' };


  const periodLabel = formatEntryPeriod(period, locale, translations.periodAllTime);
  const previousAvailable = shiftPeriod(period, -1) !== period;
  const nextAvailable = shiftPeriod(period, 1) !== period;

  useFocusEffect(
    useCallback(() => {
      if (createVisible) {
        return;
      }

      let active = true;

      async function loadHome() {
        setStatus('loading');

        try {
          const [
            activeAccounts,
            archivedAccounts,
            loadedCategories,
            loadedEntries,
            loadedCurrency,
          ] = await Promise.all([
            getAccounts(database),
            getArchivedAccounts(database),
            getCategories(database, type),
            getEntries(database, {
              type,
              ...periodBounds(period),
              accountSyncIds: accountIds,
              categorySyncIds: categoryIds,
            }),
            getPrimaryCurrency(database),
          ]);

          if (!active) {
            return;
          }

          setPrimaryCurrency(loadedCurrency);

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

  const {
    categoryTotals,
    conversionIncomplete,
  } = useEntryConversion({
    entries,
    accounts,
    primaryCurrency,
    enabled: status === 'ready' && !createVisible,
  });

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
        name: getCategoryName(category, language),
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

  function changePeriod(direction: -1 | 1) {
    setPeriod((current) => shiftPeriod(current, direction));
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
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="never"
          data={entries.filter((entry) => accountsById.has(entry.accountSyncId))}
          keyExtractor={(entry) => entry.syncId}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          ListHeaderComponent={<View style={styles.header}>
            <View style={styles.period}>
              <Pressable
                onPress={() => changePeriod(-1)}
                accessibilityRole="button"
                accessibilityLabel={translations.periodPrevious}
                accessibilityState={{ disabled: !previousAvailable }}
                disabled={!previousAvailable}
                style={[styles.arrow, { opacity: previousAvailable ? 1 : 0.3 }]}
              >
                <Text style={[styles.arrowText, { color: palette.text }]}>‹</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${translations.periodTitle}: ${periodLabel}`}
                onPress={() => setPeriodVisible(true)}
                style={({ pressed }) => [
                  styles.periodButton,
                  { backgroundColor: palette.card, borderColor: palette.line, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[styles.periodText, { color: palette.text }]}>
                  {periodLabel}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => changePeriod(1)}
                accessibilityRole="button"
                accessibilityLabel={translations.periodNext}
                accessibilityState={{ disabled: !nextAvailable }}
                disabled={!nextAvailable}
                style={[styles.arrow, { opacity: nextAvailable ? 1 : 0.3 }]}
              >
                <Text style={[styles.arrowText, { color: palette.text }]}>›</Text>
              </Pressable>
            </View>
            <View style={[styles.chartPanel, { height: chartSize }]}>
              <CategoryChart
                size={chartSize}
                available={status === 'ready' && !conversionIncomplete}
                loading={status === 'loading'}
                segments={segments}
                label={type === 'EXPENSE' ? translations.totalExpenses : translations.totalIncome}
                currencyCode={chartCurrencyCode}
                textColor={palette.text}
                mutedColor={palette.muted}
                trackColor={palette.line}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  type === 'EXPENSE'
                    ? translations.addExpense
                    : translations.addIncome
                }
                onPress={() => {
                  setEditingEntry(null);
                  setCreateVisible(true);
                }}
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
                name: getCategoryName(category, language),
              }))}
              palette={palette} />
          </View>}
          ListEmptyComponent={
            status === 'loading' ? undefined : (
              <Text
                style={[
                  styles.empty,
                  { color: palette.muted },
                ]}
              >
                {status === 'error'
                  ? translations.loadEntriesError
                  : translations.noEntriesInPeriod}
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

            const category = categories.find(
              (category) => category.syncId === item.categorySyncId,
            );

            return (
              <EntryCard
                title={item.title}
                accountName={account.name}
                iconKey={account.iconKey}
                iconColor={account.iconColor}
                categoryIconKey={category?.iconKey ?? getOtherCategoryIconKey(item.type)}
                categoryIconColor={category?.iconColor ?? null}
                categoryName={
                  category
                    ? getCategoryName(category, language)
                    : translations.entryCategory
                }
                amount={formatEntryAmount(
                  item.amountMinor,
                  account.currencyCode,
                )}
                currencyCode={account.currencyCode}
                currencySymbol={getCurrencySymbol(account.currencyCode)}
                income={item.type === 'INCOME'}
                accessibilityLabel={
                  translations.openEntry(item.title)
                }
                onPress={() => {
                  if (status !== 'ready') {
                    return;
                  }
                  setEditingEntry(item);
                  setCreateVisible(true);
                }}
              />
            );
          }
        } />
      </SafeAreaView>

      <PeriodSelector
        visible={periodVisible}
        value={period}
        type={type}
        onApply={(nextPeriod) => {
          setPeriod(nextPeriod);
          setPeriodVisible(false);
        }}
        onCancel={() => setPeriodVisible(false)}
      />

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
              type={editingEntry?.type ?? type}
              entry={editingEntry ?? undefined}
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
    marginTop: 4,
    marginBottom: 0
  },
  addButton: {
    position: 'absolute',
    right: 0,
    top: '89%',
    transform: [{ translateY: -24 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 30, lineHeight: 36 },
  header: { paddingBottom: 12 },
  period: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 0 },
  periodButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  arrow: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 32 },
  
  currency: { fontSize: 16 },
  empty: { textAlign: 'center', paddingVertical: 28, fontSize: 15 },
});
