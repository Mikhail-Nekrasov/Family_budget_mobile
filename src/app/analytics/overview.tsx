import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountIcon } from '@/components/accounts/account-icon';
import { ANALYTICS_LABEL_FLEX, MetricValues } from '@/components/analytics/metric-values';
import { PeriodSummary } from '@/components/analytics/period-summary';
import { CategoryChart } from '@/components/category-chart';
import { EntryCardSurface } from '@/components/entry-card-surface';
import { HomeFilters } from '@/components/home-filters';
import { IconBadge } from '@/components/icons/icon-badge';
import { PeriodSelector } from '@/components/periods/period-selector';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import { useAnalyticsEntries } from '@/hooks/use-analytics-entries';
import { useEntryConversion } from '@/hooks/use-entry-conversion';
import { useLanguage } from '@/hooks/use-language';
import type { EntryPeriod } from '@/models/entry-period';
import type { EntryType } from '@/models/entry-type';
import { analyticsChartSize } from '@/utils/analytics-chart-size';
import { periodAt, shiftAnchor, type QuickPeriod } from '@/utils/analytics-period';
import { getCategoryName } from '@/utils/category-name';
import { formatEntryPeriod, parsePeriodDate } from '@/utils/entry-period';
import { formatMoney } from '@/utils/format-money';

type CustomPeriod = Extract<EntryPeriod, { kind: 'range' | 'all' }>;

export default function AnalyticsScreen() {
  const { translations, locale, language } = useLanguage();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const chartSize = analyticsChartSize(width, insets.left, insets.right);
  const [accountIds, setAccountIds] = useState<string[]>([]);
  const [type, setType] = useState<EntryType | 'SUMMARY'>('EXPENSE');
  const [kind, setKind] = useState<QuickPeriod>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [customPeriod, setCustomPeriod] = useState<CustomPeriod | null>(null);
  const [rangeVisible, setRangeVisible] = useState(false);
  const period = useMemo(() => customPeriod ?? periodAt(kind, anchor), [customPeriod, kind, anchor]);
  const { data, accounts, loading, failed } = useAnalyticsEntries(type, period, undefined, accountIds);
  const { categoryTotals, totalMinor, byType, conversionIncomplete, loading: converting } = useEntryConversion({
    entries: data.entries,
    accounts: data.accounts,
    primaryCurrency: data.currency,
    enabled: !loading && !failed,
    splitByType: type === 'SUMMARY',
  });

  const palette = dark
    ? { text: '#F0F3FA', muted: '#A8B3C5', line: '#333F52', card: '#1C2432', accent: '#A0B8FF', tint: '#273958' }
    : { text: '#192238', muted: '#53617A', line: '#E0E5EE', card: '#FFFFFF', accent: '#365BBC', tint: '#EAF0FC' };
  const chartKey = JSON.stringify([type, period, data.currency, accountIds]);
  const available = !loading && !failed && !conversionIncomplete;
  const categoryIds = new Set(data.entries.map((entry) => entry.categorySyncId));
  const rows = data.categories.filter((category) => categoryIds.has(category.syncId)).map((category) => ({
    category,
    id: category.syncId,
    name: getCategoryName(category, language),
    color: category.iconColor,
    amountMinor: categoryTotals.get(category.syncId) ?? 0,
  })).sort((first, second) => second.amountMinor - first.amountMinor || first.name.localeCompare(second.name, locale));
  const shareFormatter = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  const dateLabel = formatEntryPeriod(period, locale, translations.periodAllTime);
  const modes = [
    { value: 'day', label: translations.periodDay },
    { value: 'week', label: translations.periodWeek },
    { value: 'month', label: translations.periodMonth },
    { value: 'year', label: translations.periodYear },
    { value: 'range', label: translations.periodTitle },
  ] as const;

  function arrow(direction: -1 | 1) {
    const next = shiftAnchor(kind, anchor, direction);
    const disabled = next === anchor;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={direction === -1 ? translations.periodPrevious : translations.periodNext}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => setAnchor(next)}
        style={[styles.arrow, { opacity: disabled ? 0.3 : 1 }]}
      >
        <Text style={[styles.arrowText, { color: palette.accent }]}>{direction === -1 ? '‹' : '›'}</Text>
      </Pressable>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.screen}>
        <View style={styles.fixedTabs}>
          <ScreenTabs<EntryType | 'SUMMARY'>
            options={[
              { value: 'EXPENSE', label: translations.expenses },
              { value: 'INCOME', label: translations.income },
              { value: 'SUMMARY', label: translations.analyticsSummary },
            ]}
            value={type}
            onChange={setType}
            style={styles.tabs}
            singleLine
          />
        </View>
        <FlatList
          style={styles.screen}
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          ListHeaderComponent={
            <View style={styles.header}>
              <View accessibilityRole="tablist" style={styles.modes}>
                {modes.map(({ value, label }) => {
                  const selected = value === 'range' ? customPeriod !== null : period.kind === value;
                  return (
                    <Pressable
                      key={value}
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        if (value === 'range') setRangeVisible(true);
                        else {
                          setKind(value);
                          setCustomPeriod(null);
                        }
                      }}
                      style={[styles.mode, { borderColor: selected ? palette.accent : palette.line, backgroundColor: selected ? palette.tint : palette.card }]}
                    >
                      <Text style={[styles.modeText, { color: selected ? palette.accent : palette.text }]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.period}>
                {!customPeriod && arrow(-1)}
                {customPeriod ? (
                  <Pressable accessibilityRole="button" onPress={() => setRangeVisible(true)} style={styles.date}>
                    <Text style={[styles.dateText, { color: palette.accent }]}>{dateLabel}</Text>
                  </Pressable>
                ) : (
                  <Text style={[styles.date, styles.dateText, { color: palette.text }]}>{dateLabel}</Text>
                )}
                {!customPeriod && arrow(1)}
              </View>
              <View style={styles.chartPanel}>
                {type === 'SUMMARY' ? (
                  <PeriodSummary
                    key={chartKey}
                    size={chartSize}
                    currency={data.currency}
                    income={!loading && !failed && byType && !byType.income.conversionIncomplete ? byType.income.totalMinor : null}
                    expenses={!loading && !failed && byType && !byType.expenses.conversionIncomplete ? byType.expenses.totalMinor : null}
                    loading={loading || converting}
                    failed={failed}
                  />
                ) : (
                  <View style={styles.chart}>
                    <CategoryChart
                      key={chartKey}
                      segments={rows.filter((row) => row.amountMinor > 0)}
                      totalAmountMinor={totalMinor}
                      label={type === 'EXPENSE' ? translations.expenses : translations.income}
                      currencyCode={data.currency}
                      textColor={palette.text}
                      mutedColor={palette.muted}
                      trackColor={palette.line}
                      size={chartSize}
                      available={available}
                      loading={loading || converting}
                    />
                  </View>
                )}
                <HomeFilters
                  accountIds={accountIds}
                  onAccountsChange={setAccountIds}
                  accountOptions={accounts.map((account) => ({
                    id: account.syncId,
                    name: `${account.name} · ${account.currencyCode}`,
                  }))}
                  palette={palette}
                  renderAccountTrigger={(open) => (
                    <View
                      pointerEvents="box-none"
                      style={[styles.accountActions, { top: chartSize * 0.89 - 24 }]}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={accountIds.length ? translations.selectedAccounts(accountIds.length) : translations.allAccounts}
                        onPress={open}
                        style={({ pressed }) => [
                          styles.accountFilter,
                          {
                            backgroundColor: accountIds.length ? palette.tint : palette.card,
                            borderColor: accountIds.length ? palette.accent : palette.line,
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <AccountIcon iconKey="card" color={palette.accent} size={26} />
                      </Pressable>
                      {accountIds.length > 0 && (
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => setAccountIds([])}
                          style={styles.resetAccounts}
                        >
                          <Text numberOfLines={1} style={[styles.resetAccountsText, { color: palette.accent }]}>
                            {translations.resetFilters}
                          </Text>
                        </Pressable>
                      )}
                    </View>
                  )}
                />
              </View>
            </View>
          }
          ListEmptyComponent={loading || type === 'SUMMARY' ? undefined : (
            <Text style={[styles.empty, { color: palette.muted }]}>
              {failed ? translations.loadEntriesError : translations.noEntriesInPeriod}
            </Text>
          )}
          renderItem={({ item }) => {
            if (type === 'SUMMARY') return null;
            const share = available && totalMinor > 0 ? shareFormatter.format(item.amountMinor / totalMinor) : '—';
            const amount = available ? formatMoney(item.amountMinor, data.currency, locale) : '—';
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.name}, ${share}, ${amount}`}
                onPress={() => router.push({
                  pathname: '/analytics/entries',
                  params: { categoryId: item.id, type, period: JSON.stringify(period), accounts: JSON.stringify(accountIds) },
                })}
                style={({ pressed }) => [
                  styles.card,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <EntryCardSurface />
                <View style={styles.category}>
                  <IconBadge kind="category" iconKey={item.category.iconKey} color={item.color} size={40} />
                  <Text numberOfLines={2} style={[styles.name, { color: palette.text }]}>{item.name}</Text>
                </View>
                <MetricValues amount={amount} share={share} textColor={palette.text} shareColor={palette.muted} />
              </Pressable>
            );
          }}
        />
      </SafeAreaView>
      <PeriodSelector
        visible={rangeVisible}
        rangeOnly
        value={period}
        type={type}
        onApply={(next) => {
          if (next.kind === 'range' || next.kind === 'all') {
            setCustomPeriod(next);
            if (next.kind === 'range') setAnchor(parsePeriodDate(next.through));
          }
          setRangeVisible(false);
        }}
        onCancel={() => setRangeVisible(false)}
      />
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 20, gap: 8 },
  header: { gap: 3 },
  fixedTabs: { paddingHorizontal: 16, paddingTop: 12 },
  tabs: { flex: 0, flexBasis: 'auto' },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  mode: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: 40, paddingHorizontal: 7, borderWidth: 1, borderRadius: 10 },
  modeText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  period: { flexDirection: 'row', alignItems: 'center', minHeight: 36 },
  arrow: { width: 44, height: 36, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 30, lineHeight: 36 },
  date: { flex: 1 },
  dateText: { textAlign: 'center', fontSize: 15, fontWeight: '600' },
  chartPanel: { position: 'relative' },
  accountActions: { position: 'absolute', left: 0, alignItems: 'flex-start', gap: 1 },
  accountFilter: {
    width: 48, height: 48, borderRadius: 24, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  chart: { alignItems: 'center', paddingBottom: 8 },
  resetAccounts: { justifyContent: 'center' },
  resetAccountsText: { fontSize: 12, lineHeight: 16 },
  card: { minHeight: 62, borderRadius: 16, overflow: 'hidden', padding: 12, flexDirection: 'row', alignItems: 'center' },
  category: { flex: ANALYTICS_LABEL_FLEX, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flex: 1, marginRight: 8, fontSize: 15, fontWeight: '500' },
  empty: { textAlign: 'center', padding: 14 },
});
