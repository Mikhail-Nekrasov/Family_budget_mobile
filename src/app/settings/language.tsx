import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import { useLanguage } from '@/hooks/use-language';
import type { Language } from '@/i18n/languages';

const languageOptions: {
  code: Language;
  label: string;
}[] = [
  {
    code: 'en',
    label: 'English',
  },
  {
    code: 'ru',
    label: 'Русский',
  },
  {
    code: 'fi',
    label: 'Suomi',
  },
];

export default function LanguageScreen() {
  const { language, setLanguage, translations } = useLanguage();
  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        background: '#111722',
        card: '#1C2432',
        text: '#F0F3FA',
        border: '#333F52',
        accent: '#A0B8FF',
      }
    : {
        background: '#F5F6F9',
        card: '#FFFFFF',
        text: '#192238',
        border: '#E0E5EE',
        accent: '#365BBC',
      };

  return (
    <ScreenBackground>
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={[
          styles.screen,
        ]}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={[styles.sectionTitle, { color: palette.text }]}>
            {translations.language}
          </Text>

          <View style={styles.options}>
            {languageOptions.map((option) => {
              const selected = language === option.code;

              return (
                <Pressable
                  key={option.code}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setLanguage(option.code)}
                  style={[
                    styles.option,
                    {
                      backgroundColor: palette.card,
                      borderColor: selected
                        ? palette.accent
                        : palette.border,
                    },
                  ]}
                >
                  <Text style={[styles.label, { color: palette.text }]}>
                    {option.label}
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