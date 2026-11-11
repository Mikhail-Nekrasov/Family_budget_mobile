import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useColorScheme, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppSwitch } from '@/components/app-switch';
import { CategoryChart, type ChartSegment } from '@/components/category-chart';
import { CurrencyPickerButton } from '@/components/currency-picker-button';
import { ScreenBackground } from '@/components/screen-background';
import type { CurrencyCode } from '@/constants/currencies';
import { dashboardChartSize, useHomeChartOffset } from '@/hooks/use-home-chart-offset';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import type { ExchangeRateSnapshot } from '@/models/exchange-rate-snapshot';
import { getAccounts, getArchivedAccounts } from '@/repositories/account-repository';
import { getExchangeRateSnapshot } from '@/repositories/exchange-rate-repository';
import { getPrimaryCurrency } from '@/repositories/preferences-repository';
import { calculateAccountOverview } from '@/services/account-overview-service';
import { formatMoney } from '@/utils/format-money';

const BALANCE_ROW_PADDING = 16;
const BALANCE_ROW_BORDER = 1;

type OverviewData = {
  accounts: Account[];
  snapshot: ExchangeRateSnapshot | null;
  primaryCurrency: CurrencyCode;
};

export default function AccountOverviewScreen() {
  const database = useSQLiteContext();
  const { locale, translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const chartSize = dashboardChartSize(width, insets.left, insets.right);
  const chartTop = useHomeChartOffset();
  const [data, setData] = useState<OverviewData | null>(null);
  const [failed, setFailed] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const palette = dark
    ? { card: '#1C2432', text: '#F0F3FA', muted: '#A8B3C5', line: '#333F52' }
    : { card: '#FFFFFF', text: '#192238', muted: '#6C7890', line: '#E0E5EE' };

  useFocusEffect(useCallback(() => {
    let active = true;

    async function load() {
      try {
        const [accounts, archived, snapshot, primaryCurrency] = await Promise.all([
          getAccounts(database),
          getArchivedAccounts(database),
          getExchangeRateSnapshot(database),
          getPrimaryCurrency(database),
        ]);
        if (!active) return;
        setData({ accounts: [...accounts, ...archived], snapshot, primaryCurrency });
        setFailed(false);
      } catch (error) {
        console.warn('Failed to load account overview', error);
        if (active) {
          setData(null);
          setFailed(true);
        }
      }
    }

    void load();
    return () => { active = false; };
  }, [database]));

  const currency = selectedCurrency ?? data?.primaryCurrency ?? null;
  const overview = useMemo(() => data && currency
    ? calculateAccountOverview(data.accounts, currency, data.snapshot)
    : null, [data, currency]);
  const chartAccounts = showHidden ? overview?.all : overview?.visible;
  const chartTotal = showHidden ? overview?.allTotal : overview?.visibleTotal;
  const segments: ChartSegment[] = chartAccounts?.flatMap(({ account, amount }) => {
    if (amount === null || amount === 0) return [];
    return [{
      id: account.syncId,
      name: account.archivedAt ? `${account.name} (${translations.accountArchived})` : account.name,
      color: account.iconColor,
      amountMinor: amount,
    }];
  }) ?? [];

  function formatTotal(amount: number | null | undefined) {
    return amount == null || !currency ? '—' : formatMoney(amount, currency, locale);
  }

  return (
    <ScreenBackground>
      <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={styles.screen}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: chartTop }]}
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          showsVerticalScrollIndicator={false}
        >
          {failed ? (
            <Text style={[styles.message, { color: palette.muted }]}>{translations.loadAccountsError}</Text>
          ) : (
            <>
              <View style={styles.chart}>
                <CategoryChart
                  key={`${currency ?? 'loading'}:${showHidden}`}
                  segments={segments}
                  label={translations.accountOverviewTotal}
                  totalAmountMinor={chartTotal ?? 0}
                  currencyCode={currency ?? 'EUR'}
                  textColor={palette.text}
                  mutedColor={palette.muted}
                  trackColor={palette.line}
                  size={chartSize}
                  available={chartTotal != null}
                  loading={!overview}
                />
              </View>
              <View style={styles.totals}>
                {[
                  { label: translations.accountOverviewWithoutHidden, value: formatTotal(overview?.visibleTotal) },
                  { label: translations.accountOverviewOnlyHidden, value: showHidden ? formatTotal(overview?.hiddenTotal) : '******' },
                  { label: translations.accountOverviewAll, value: showHidden ? formatTotal(overview?.allTotal) : '******' },
                ].map(({ label, value }) => (
                  <View
                    key={label}
                    style={[styles.balanceRow, { backgroundColor: palette.card, borderColor: palette.line }]}
                  >
                    <Text style={[styles.balanceLabel, { color: palette.text }]}>{label}</Text>
                    <Text style={[styles.amount, { color: palette.text }]}>{value}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.reveal}>
                <AppSwitch
                  label={translations.showHiddenAccounts}
                  value={showHidden}
                  onValueChange={setShowHidden}
                />
              </View>
            </>
          )}
          <View style={styles.footer}>
            <CurrencyPickerButton
              label={translations.currency}
              currency={currency}
              onCurrencyChange={setSelectedCurrency}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 20, gap: 16 },
  chart: { alignItems: 'center', marginBottom: 28 },
  totals: { gap: 8 },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: BALANCE_ROW_PADDING,
    paddingVertical: 12,
    borderWidth: BALANCE_ROW_BORDER,
    borderRadius: 16,
  },
  reveal: { paddingHorizontal: BALANCE_ROW_PADDING + BALANCE_ROW_BORDER },
  balanceLabel: { flex: 1, fontSize: 16, fontWeight: '500' },
  amount: {
    flexShrink: 1,
    maxWidth: '52%',
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  message: { textAlign: 'center', fontSize: 14 },
  footer: { marginTop: 'auto', paddingTop: 8 },
});
