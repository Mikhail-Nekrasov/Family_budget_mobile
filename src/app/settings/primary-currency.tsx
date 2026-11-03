import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import {
    CURRENCY_CODES,
    CURRENCY_SYMBOLS,
    type CurrencyCode,
} from '@/constants/currencies';
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import {
    getPrimaryCurrency,
    setPrimaryCurrency,
} from '@/repositories/preferences-repository';

export default function PrimaryCurrencyScreen() {
  const database = useSQLiteContext();
  const { translations } = useLanguage();
  const { showFormError } = useFormErrors<'currency'>();
  const dark = useColorScheme() === 'dark';

  const [selectedCurrency, setSelectedCurrency] =
    useState<CurrencyCode | null>(null);

  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const palette = dark
    ? {
        card: '#1C2432',
        text: '#F0F3FA',
        border: '#333F52',
        accent: '#A0B8FF',
      }
    : {
        card: '#FFFFFF',
        text: '#192238',
        border: '#E0E5EE',
        accent: '#365BBC',
      };

  useEffect(() => {
    let active = true;

    async function loadCurrency() {
      try {
        const currency = await getPrimaryCurrency(database);

        if (active) {
          setSelectedCurrency(currency);
        }
      } catch (error) {
        console.warn('Failed to load primary currency', error);

        if (active) {
          setLoadFailed(true);
        }
      }
    }

    void loadCurrency();

    return () => {
      active = false;
    };
  }, [database]);

  async function selectCurrency(code: CurrencyCode) {
    if (
      savingRef.current ||
      code === selectedCurrency
    ) {
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      await setPrimaryCurrency(database, code);
      setSelectedCurrency(code);
    } catch (error) {
      console.warn('Failed to save primary currency', error);
      showFormError(translations.savePreferencesError);
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <ScreenBackground>
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={styles.screen}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text
            style={[
              styles.sectionTitle,
              { color: palette.text },
            ]}
          >
            {translations.primaryCurrency}
          </Text>

          {loadFailed ? (
            <Text style={{ color: palette.text }}>
              {translations.loadPreferencesError}
            </Text>
          ) : selectedCurrency === null ? (
            <ActivityIndicator
              color={palette.text}
              accessibilityLabel={translations.loading}
            />
          ) : (
            <View style={styles.options}>
              {CURRENCY_CODES.map((code) => {
                const selected = selectedCurrency === code;

                return (
                  <Pressable
                    key={code}
                    accessibilityRole="radio"
                    accessibilityLabel={
                      `${code}, ${CURRENCY_SYMBOLS[code]}`
                    }
                    accessibilityState={{
                      checked: selected,
                      disabled: saving,
                    }}
                    disabled={saving}
                    onPress={() => void selectCurrency(code)}
                    style={({ pressed }) => [
                      styles.option,
                      {
                        backgroundColor: palette.card,
                        borderColor: selected
                          ? palette.accent
                          : palette.border,
                        opacity: saving
                          ? 0.6
                          : pressed
                            ? 0.75
                            : 1,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.label,
                        { color: palette.text },
                      ]}
                    >
                      {code} · {CURRENCY_SYMBOLS[code]}
                    </Text>

                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected
                            ? palette.accent
                            : palette.border,
                        },
                      ]}
                    >
                      {selected && (
                        <View
                          style={[
                            styles.radioDot,
                            { backgroundColor: palette.accent },
                          ]}
                        />
                      )}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  options: {
    gap: 10,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 16,
  },
  label: {
    flex: 1,
    fontSize: 16,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});