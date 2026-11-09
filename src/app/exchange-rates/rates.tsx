import { useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ExchangeRateCard } from '@/components/exchange-rates/exchange-rate-card';
import { RateFilters } from '@/components/exchange-rates/rate-filters';
import { ScreenBackground } from '@/components/screen-background';
import type { CurrencyCode } from '@/constants/currencies';
import { useExchangeRateList } from '@/hooks/use-exchange-rate-list';
import { useLanguage } from '@/hooks/use-language';
import { getPrimaryCurrency } from '@/repositories/preferences-repository';
import { buildRateListRows } from '@/services/exchange-rate-list-service';

function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export default function ExchangeRatesScreen() {
  const database = useSQLiteContext();
  const { translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
  const [currency, setCurrency] = useState<CurrencyCode | null>(null);
  const [preferencesFailed, setPreferencesFailed] = useState(false);
  const [historical, setHistorical] = useState(false);
  const [date, setDate] = useState(() => new Date());
  const { data, loading, failed, online, refresh } = useExchangeRateList(
    historical ? localDateKey(date) : null,
  );
  const rows = useMemo(
    () => currency === null ? [] : buildRateListRows(data, currency),
    [data, currency],
  );
  const muted = dark ? '#A8B3C5' : '#6C7890';

  useFocusEffect(useCallback(() => {
    let active = true;
    async function loadPreference() {
      try {
        const saved = await getPrimaryCurrency(database);
        if (active) {
          // A temporary choice here does not change the app's primary currency.
          setCurrency((current) => current ?? saved);
          setPreferencesFailed(false);
        }
      } catch (error) {
        console.warn('Failed to load exchange rate base currency', error);
        if (active) {
          setPreferencesFailed(true);
        }
      }
    }
    void loadPreference();
    return () => { active = false; };
  }, [database]));

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
          renderItem={({ item }) => (
            <ExchangeRateCard row={item} baseCurrency={currency ?? data.baseCurrency} />
          )}
        />
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
