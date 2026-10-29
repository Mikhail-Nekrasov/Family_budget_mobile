import { useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import { useLanguage } from '@/hooks/use-language';
import type { Language } from '@/i18n/languages';

const languageNames: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  fi: 'Suomi',
};

export default function SettingsScreen() {
  const router = useRouter();
  const { language, translations } = useLanguage();
  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        card: '#1C2432',
        text: '#F0F3FA',
        muted: '#A8B3C5',
        border: '#333F52',
      }
    : {
        card: '#FFFFFF',
        text: '#192238',
        muted: '#6C7890',
        border: '#E0E5EE',
      };

  return (
    <ScreenBackground>
      <SafeAreaView
        edges={['left', 'right', 'bottom']}
        style={styles.screen}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/settings/language')}
            style={({ pressed }) => [
              styles.setting,
              {
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: palette.text },
              ]}
            >
              {translations.language}
            </Text>

            <Text
              style={[
                styles.value,
                { color: palette.muted },
              ]}
            >
              {languageNames[language]}
            </Text>

            <Text
              accessible={false}
              style={[
                styles.arrow,
                { color: palette.muted },
              ]}
            >
              ›
            </Text>
          </Pressable>
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
    gap: 12,
  },
  setting: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  value: {
    fontSize: 16,
  },
  arrow: {
    fontSize: 26,
    lineHeight: 30,
  },
});