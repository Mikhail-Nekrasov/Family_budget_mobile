import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { useLanguage } from '@/hooks/use-language';
import { LanguageProvider } from '@/i18n/language-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <LanguageProvider>
      <AppNavigation />
    </LanguageProvider>
  );
}

function AppNavigation() {
  const colorScheme = useColorScheme();
  const { translations } = useLanguage();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
      >
        <AnimatedSplashOverlay />

        <Drawer>
          <Drawer.Screen
            name="index"
            options={{
              drawerLabel: translations.home,
              title: translations.home,
              headerShown: false,
            }}
          />

          <Drawer.Screen
            name="accounts"
            options={{
              drawerLabel: translations.accounts,
              title: translations.accounts,
              headerShown: true,
            }}
          />

          <Drawer.Screen
            name="settings"
            options={{
              drawerLabel: translations.settings,
              title: translations.settings,
              headerShown: true,
            }}
          />

          <Drawer.Screen
            name="explore"
            options={{
              drawerItemStyle: {
                display: 'none',
              },
            }}
          />
        </Drawer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}