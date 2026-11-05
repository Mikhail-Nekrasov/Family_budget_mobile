import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import {
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import { ScreenTabs } from '@/components/screen-tabs';
import { CURRENCY_CODES, CURRENCY_SYMBOLS, type CurrencyCode } from '@/constants/currencies';
import { useLanguage } from '@/hooks/use-language';

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
  const [dialog, setDialog] = useState<'currency' | 'date' | null>(null);
  const [draft, setDraft] = useState(date);
  const palette = dark
    ? { background: '#111722', card: '#1C2432', text: '#F0F3FA', border: '#333F52', accent: '#A0B8FF' }
    : { background: '#F5F6F9', card: '#FFFFFF', text: '#192238', border: '#E0E5EE', accent: '#365BBC' };
  const dateLabel = new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(date);

  return (
    <>
      <ScreenTabs
        options={[
          { value: 'current', label: translations.ratesCurrent },
          { value: 'historical', label: translations.ratesHistorical },
        ]}
        value={historical ? 'historical' : 'current'}
        onChange={(value) => onHistoricalChange(value === 'historical')}
      />
      <AppButton
        title={`${translations.ratesBaseCurrency}: ${currency ? `${currency} · ${CURRENCY_SYMBOLS[currency]}` : translations.loading}`}
        nativeGlass
        onPress={() => setDialog('currency')}
      />
      {historical && (
        <AppButton
          title={`${translations.entryDate}: ${dateLabel}`}
          nativeGlass
          onPress={() => {
            setDraft(new Date(date.getTime()));
            setDialog('date');
          }}
        />
      )}
      <Modal
        visible={dialog !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        backdropColor={palette.background}
        onRequestClose={() => setDialog(null)}
      >
        {dialog !== null && (
          <SafeAreaProvider style={[styles.screen, { backgroundColor: palette.background }]}>
            <ScreenBackground>
              <SafeAreaView style={styles.screen}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.title, { color: palette.text }]}>
                    {dialog === 'currency' ? translations.ratesBaseCurrency : translations.entryDate}
                  </Text>
                  {dialog === 'currency' ? CURRENCY_CODES.map((code) => (
                    <Pressable
                      key={code}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: currency === code }}
                      onPress={() => {
                        onCurrencyChange(code);
                        setDialog(null);
                      }}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          backgroundColor: palette.card,
                          borderColor: currency === code ? palette.accent : palette.border,
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.label, { color: palette.text }]}>
                        {code} · {CURRENCY_SYMBOLS[code]}
                      </Text>
                      <Text style={{ color: palette.accent }}>
                        {currency === code ? '✓' : ''}
                      </Text>
                    </Pressable>
                  )) : (
                    <>
                      <View style={[styles.pickerPanel, { backgroundColor: palette.card }]}>
                        <ExpoDateTimePicker
                          value={draft}
                          mode="date"
                          presentation="inline"
                          display={Platform.OS === 'ios' ? 'inline' : 'default'}
                          maximumDate={new Date()}
                          locale={locale.replace(/-/g, '_')}
                          accentColor={palette.accent}
                          onValueChange={(_, selectedDate) => setDraft(selectedDate)}
                        />
                      </View>
                      <AppButton title={translations.today} nativeGlass onPress={() => setDraft(new Date())} />
                    </>
                  )}
                </ScrollView>
                <View style={styles.actions}>
                  {dialog === 'date' && (
                    <AppButton
                      title={translations.select}
                      nativeGlass
                      onPress={() => {
                        onDateChange(new Date(draft.getTime()));
                        setDialog(null);
                      }}
                    />
                  )}
                  <AppButton title={translations.cancel} nativeGlass onPress={() => setDialog(null)} />
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
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  label: {
    fontSize: 16,
  },
  pickerPanel: {
    padding: 8,
    borderRadius: 16,
  },
  actions: {
    padding: 20,
    gap: 12,
  },
});
