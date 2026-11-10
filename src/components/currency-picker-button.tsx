import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import { CURRENCY_CODES, CURRENCY_SYMBOLS, type CurrencyCode } from '@/constants/currencies';
import { useLanguage } from '@/hooks/use-language';

type Props = {
  label: string;
  currency: CurrencyCode | null;
  onCurrencyChange: (currency: CurrencyCode) => void;
};

export function CurrencyPickerButton({ label, currency, onCurrencyChange }: Props) {
  const { translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const [visible, setVisible] = useState(false);
  const palette = dark
    ? { background: '#111722', card: '#1C2432', text: '#F0F3FA', border: '#333F52', accent: '#A0B8FF' }
    : { background: '#F5F6F9', card: '#FFFFFF', text: '#192238', border: '#E0E5EE', accent: '#365BBC' };

  return (
    <>
      <AppButton
        title={`${label}: ${currency ? `${currency} · ${CURRENCY_SYMBOLS[currency]}` : translations.loading}`}
        keepTitleCentered
        rightIcon="dropdown"
        nativeGlass
        onPress={() => setVisible(true)}
      />
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="fullScreen"
        backdropColor={palette.background}
        onRequestClose={() => setVisible(false)}
      >
        {visible && (
          <SafeAreaProvider style={[styles.screen, { backgroundColor: palette.background }]}>
            <ScreenBackground>
              <SafeAreaView style={styles.screen}>
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                  <Text style={[styles.title, { color: palette.text }]}>{label}</Text>
                  {CURRENCY_CODES.map((code) => (
                    <Pressable
                      key={code}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: currency === code }}
                      onPress={() => {
                        onCurrencyChange(code);
                        setVisible(false);
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
                      <Text style={[styles.label, { color: palette.text }]}>{code} · {CURRENCY_SYMBOLS[code]}</Text>
                      <Text style={{ color: palette.accent }}>{currency === code ? '✓' : ''}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
                <View style={styles.actions}>
                  <AppButton
                    title={translations.cancel}
                    keepTitleCentered
                    rightIcon="cancel"
                    nativeGlass
                    onPress={() => setVisible(false)}
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
  screen: { flex: 1 },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontWeight: '600', marginBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    padding: 16,
    borderWidth: 1,
    borderRadius: 16,
  },
  label: { fontSize: 16 },
  actions: { padding: 20, gap: 12 },
});
