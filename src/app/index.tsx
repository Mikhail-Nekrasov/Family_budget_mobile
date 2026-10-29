import { CategoryChart, type ChartSegment } from '@/components/category-chart';
import { EntryCard } from '@/components/entry-card';
import { HomeFilters } from '@/components/home-filters';
import { MenuButton } from '@/components/menu-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import { accounts, categories, demoEntries, formatAmount, type EntryType } from '@/data/home-demo';
import { useLanguage } from '@/hooks/use-language';
import { useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const { translations, locale } = useLanguage();
  const [type, setType] = useState<EntryType>('EXPENSE');
  const [period, setPeriod] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const palette = dark
    ? { background: '#111722', card: '#1C2432', text: '#F0F3FA', muted: '#A8B3C5', line: '#333F52', accent: '#A0B8FF', icon: '#29354B' }
    : { background: '#F5F6F9', card: '#FFFFFF', text: '#192238', muted: '#6C7890', line: '#E0E5EE', accent: '#365BBC', icon: '#EAF0FC' };

  const monthKey = `${period.getFullYear()}-${String(period.getMonth() + 1).padStart(2, '0')}`;
  const monthLabel = new Intl.DateTimeFormat(locale, {
    month: 'long',
    year: 'numeric',
  }).format(period);
  const entries = demoEntries.filter((entry) => entry.type === type && entry.month === monthKey
    && (accountIds.length === 0 || accountIds.includes(entry.accountId))
    && (categoryIds.length === 0 || categoryIds.includes(entry.categoryId)));
  const segments: ChartSegment[] = Object.entries(categories).map(([id, category]) => ({
    id, name: category.name, color: category.color,
    amountCents: entries.filter((entry) => entry.categoryId === id).reduce((sum, entry) => sum + entry.amountCents, 0),
  })).filter((segment) => segment.amountCents > 0);

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

        <FlatList data={entries} keyExtractor={(entry) => entry.id}
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
            <CategoryChart segments={segments} 
              label={
                type === 'EXPENSE'
                  ? translations.totalExpenses
                  : translations.totalIncome
              }
              currencySymbol="€" textColor={palette.text} mutedColor={palette.muted} trackColor={palette.line} />
            <Pressable accessibilityRole="button" 
              accessibilityLabel={
                type === 'EXPENSE'
                  ? translations.addExpense
                  : translations.addIncome
              }
              onPress={() =>
                Alert.alert(
                  type === 'EXPENSE'
                    ? translations.newExpense
                    : translations.newIncome,
                  translations.createEntryPlaceholder,
                )
              }
              style={[styles.addButton, { backgroundColor: palette.accent }]}>
              <Text style={[styles.addText, { color: palette.background }]}>＋</Text>
            </Pressable>
            </View>
            <HomeFilters accountIds={accountIds} categoryIds={categoryIds}
              onAccountsChange={setAccountIds} onCategoriesChange={setCategoryIds}
              categoryOptions={Object.entries(categories)
                .filter(([id]) => type === 'EXPENSE'
                  ? ['groceries', 'housing', 'transport'].includes(id)
                  : ['salary', 'otherIncome'].includes(id))
                .map(([id, category]) => ({ id, name: category.name }))}
              palette={palette} />
          </View>}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: palette.muted }]}>
              {translations.noEntries}
            </Text>
          }
          renderItem={({ item }) => {
            const account = accounts[item.accountId];

            return (
              <EntryCard
                title={item.title}
                accountName={account.name}
                iconKey={account.iconKey}
                amount={formatAmount(item.amountCents, locale)}
                currencyCode={account.currencyCode}
                currencySymbol={account.currencySymbol}
                income={item.type === 'INCOME'}
                accessibilityLabel={translations.openEntry(item.title)}
                onPress={() =>
                  Alert.alert(
                    item.title,
                    translations.editEntryPlaceholder(item.id),
                  )
                }
              />
            );
          }
        } />
      </SafeAreaView>
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
