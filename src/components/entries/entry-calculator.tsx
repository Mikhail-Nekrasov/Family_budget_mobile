import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import { useLanguage } from '@/hooks/use-language';
import { calculatorAmount, createCalculator, pressCalculatorKey, type CalculatorKey } from '@/utils/entry-calculator';
import { currencyFractionDigits } from '@/utils/money';

const KEYS = [
  ['back', 'clear', 'percent', '/'],
  ['1', '2', '3', '*'],
  ['4', '5', '6', '-'],
  ['7', '8', '9', '+'],
  ['sign', '0', 'decimal', 'equals'],
] as const satisfies readonly (readonly CalculatorKey[])[];

type Props = {
  visible: boolean;
  amount: string;
  currencyCode: string;
  onUse: (amount: string) => void;
  onClose: () => void;
};

export function EntryCalculator(props: Props) {
  const dark = useColorScheme() === 'dark';
  const background = dark ? '#111722' : '#F5F6F9';

  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      backdropColor={background}
      onRequestClose={props.onClose}
    >
      {props.visible && (
        <SafeAreaProvider style={[styles.screen, { backgroundColor: background }]}>
          <CalculatorScreen {...props} />
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

function CalculatorScreen({ amount, currencyCode, onUse, onClose }: Props) {
  const { translations, locale } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const [state, setState] = useState(() => createCalculator(amount));
  const decimal = new Intl.NumberFormat(locale).format(1.1).replace(/[0-9]/g, '');
  const result = calculatorAmount(state, currencyFractionDigits(currencyCode));
  const palette = dark
    ? { text: '#F0F3FA', muted: '#A8B3C5', key: '#29354B', border: '#333F52', accent: '#A0B8FF', action: '#344979' }
    : { text: '#192238', muted: '#6C7890', key: '#FFFFFF', border: '#E0E5EE', accent: '#365BBC', action: '#E5EDFF' };
  const labels: Partial<Record<CalculatorKey, string>> = {
    back: '⌫', clear: state.error || state.replace || state.input === '0' ? 'AC' : 'C',
    percent: '%', '/': '÷', '*': '×', '-': '−', sign: '+/−', decimal, equals: '=',
  };
  const accessibilityLabels: Partial<Record<CalculatorKey, string>> = {
    back: translations.calculatorBackspace,
    clear: translations.calculatorClear,
    sign: translations.calculatorChangeSign,
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen}>
        <View style={[styles.header, { borderBottomColor: palette.border }]}>
          <AppButton title={translations.cancel} rightIcon="cancel" iconOnly nativeGlass onPress={onClose} />
          <Text accessibilityRole="header" style={[styles.heading, { color: palette.text }]}>{translations.calculator}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <AppButton
            title={translations.calculatorUseAmount}
            rightIcon="check"
            keepTitleCentered
            nativeGlass
            disabled={result === null}
            onPress={() => { if (result !== null) onUse(result.replace('.', decimal)); }}
          />
          <View style={styles.bottom}>
            <Text
              accessibilityLiveRegion="polite"
              numberOfLines={1}
              adjustsFontSizeToFit
              style={[styles.result, { color: state.error ? palette.muted : palette.text }]}
            >
              {state.error ? translations.calculatorInvalid : state.input.replace('.', decimal)}
            </Text>
            {KEYS.map((row, index) => (
              <View key={index} style={styles.row}>
                {row.map((key, column) => (
                  <Pressable
                    key={key}
                    accessibilityRole="button"
                    accessibilityLabel={accessibilityLabels[key] ?? labels[key] ?? key}
                    onPress={() => setState((current) => pressCalculatorKey(current, key))}
                    style={({ pressed }) => [
                      styles.key,
                      {
                        backgroundColor: column === 3 ? palette.action : palette.key,
                        borderColor: palette.border,
                        opacity: pressed ? 0.7 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.keyText, { color: column === 3 ? palette.accent : palette.text }]}>
                      {labels[key] ?? key}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12, paddingBottom: 6,
  },
  heading: { fontSize: 18, fontWeight: '600', textAlign: 'center' },
  headerSpacer: { width: 48 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  bottom: { marginTop: 'auto', gap: 8, paddingTop: 16 },
  result: { textAlign: 'right', fontSize: 40, fontWeight: '600', fontVariant: ['tabular-nums'], paddingHorizontal: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1, minHeight: 48, borderWidth: 1, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  keyText: { fontSize: 23, fontWeight: '500' },
});
