import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ExchangeRateCard } from '@/components/exchange-rates/exchange-rate-card';
import { RateFilters } from '@/components/exchange-rates/rate-filters';
import { ScreenBackground } from '@/components/screen-background';
import { StartupEmptyLayout, useStartupScreenLayout } from '@/components/startup-layout';
import type { CurrencyCode } from '@/constants/currencies';
import { useExchangeRateList } from '@/hooks/use-exchange-rate-list';
import { useLanguage } from '@/hooks/use-language';
import { usePrimaryCurrencyPreference } from '@/hooks/use-primary-currency-preference';
import { buildRateListRows } from '@/services/exchange-rate-list-service';

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ExchangeRatesScreen() {
  const { translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const { currency: primaryCurrency, status: preferencesStatus } = usePrimaryCurrencyPreference();
  const [selectedCurrency, setCurrency] = useState<CurrencyCode | null>(null);
  const currency = selectedCurrency ?? primaryCurrency;
  const preferencesFailed = preferencesStatus === 'error';
  const [historical, setHistorical] = useState(false);
  const [date, setDate] = useState(() => new Date(new Date().getFullYear(), 0, 1));
  const { data, loading, failed, online, refresh, localReady } = useExchangeRateList(
    historical ? localDateKey(date) : null,
  );
  const rows = useMemo(
    () => !localReady || currency === null ? [] : buildRateListRows(data, currency),
    [data, currency, localReady],
  );
  const muted = dark ? '#A8B3C5' : '#6C7890';

  const markStartupLayout = useStartupScreenLayout(
    'exchangeRates',
    localReady && preferencesStatus !== 'loading',
  );

  return (
    <ScreenBackground>
      <SafeAreaView edges={['left', 'right']} style={styles.screen}>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.currencyCode}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          ListHeaderComponent={
            <View style={styles.header}>
              <RateFilters
                currency={currency}
                onCurrencyChange={setCurrency}
                historical={historical}
                onHistoricalChange={setHistorical}
                date={date}
                onDateChange={setDate}
              />
              {!historical && (
                <AppButton
                  title={translations.ratesRefresh}
                  keepTitleCentered
                  rightIcon="refresh"
                  nativeGlass
                  disabled={!online}
                  loading={loading}
                  onPress={refresh}
                />
              )}
              {!online && <Text style={[styles.message, { color: muted }]}>{translations.ratesOffline}</Text>}
              {failed && <Text accessibilityRole="alert" style={[styles.message, { color: muted }]}>{translations.ratesLoadError}</Text>}
              {preferencesFailed && currency === null && (
                <Text style={[styles.message, { color: muted }]}>{translations.loadPreferencesError}</Text>
              )}
              {!loading && currency !== null && rows.some((row) => row.rate === null) && (
                <Text style={[styles.message, { color: muted }]}>{translations.ratesMissing}</Text>
              )}
            </View>
          }
          renderItem={({ item, index }) => (
            <ExchangeRateCard
              row={item}
              baseCurrency={currency ?? data.baseCurrency}
              onLayout={index === 0 ? markStartupLayout : undefined}
            />
          )}
        />
        {!rows.length && <StartupEmptyLayout onLayout={markStartupLayout} />}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  header: {
    gap: 12,
    paddingBottom: 4,
  },
  message: {
    fontSize: 14,
  },
});
