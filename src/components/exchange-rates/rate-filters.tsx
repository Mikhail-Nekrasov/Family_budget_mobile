import { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppCalendar } from '@/components/calendar/app-calendar';
import { CurrencyPickerButton } from '@/components/currency-picker-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import type { CurrencyCode } from '@/constants/currencies';
import { useLanguage } from '@/hooks/use-language';
import { formatCalendarDate } from '@/utils/calendar-date';

type Props = {
  currency: CurrencyCode | null;
  onCurrencyChange: (currency: CurrencyCode) => void;
  date: Date;
  historical: boolean;
  onDateChange: (date: Date) => void;
  onHistoricalChange: (historical: boolean) => void;
};

export function RateFilters({
  currency, onCurrencyChange, date, historical, onDateChange, onHistoricalChange,
}: Props) {
  const { translations, locale } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const [dateVisible, setDateVisible] = useState(false);
  const [draft, setDraft] = useState(date);
  const palette = dark
    ? { background: '#111722', text: '#F0F3FA' }
    : { background: '#F5F6F9', text: '#192238' };
  const dateLabel = formatCalendarDate(date, locale);

  return (
    <>
      <ScreenTabs
        style={styles.tabs}
        options={[
          { value: 'current', label: translations.ratesCurrent },
          { value: 'historical', label: translations.ratesHistorical },
        ]}
        value={historical ? 'historical' : 'current'}
        onChange={(value) => onHistoricalChange(value === 'historical')}
      />
      <CurrencyPickerButton
        label={translations.ratesBaseCurrency}
        currency={currency}
        onCurrencyChange={onCurrencyChange}
      />
      {historical && (
        <AppButton
          title={`${translations.entryDate}: ${dateLabel}`}
          keepTitleCentered
          rightIcon="calendar"
          nativeGlass
          onPress={() => {
            setDraft(new Date(date.getTime()));
            setDateVisible(true);
          }}
        />
      )}
      <Modal
        visible={dateVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        backdropColor={palette.background}
        onRequestClose={() => setDateVisible(false)}
      >
        {dateVisible && (
          <SafeAreaProvider style={[styles.screen, { backgroundColor: palette.background }]}>
            <ScreenBackground>
              <SafeAreaView style={styles.screen}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.title, { color: palette.text }]}>
                    {translations.entryDate}
                  </Text>
                  <AppCalendar value={draft} onChange={setDraft} />
                </ScrollView>
                <View style={styles.actions}>
                  <AppButton
                    title={translations.select}
                    keepTitleCentered
                    rightIcon="check"
                    nativeGlass
                    onPress={() => {
                      onDateChange(new Date(draft.getTime()));
                      setDateVisible(false);
                    }}
                  />
                  <AppButton
                    title={translations.cancel}
                    keepTitleCentered
                    rightIcon="cancel"
                    nativeGlass
                    onPress={() => setDateVisible(false)}
                  />
                </View>
              </SafeAreaView>
            </ScreenBackground>
          </SafeAreaProvider>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  tabs: { flex: 0, flexBasis: 'auto' },
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  actions: {
    padding: 20,
    gap: 12,
  },
});
