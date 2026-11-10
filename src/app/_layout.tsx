import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

//import { apiRequest } from '@/api/api-client';
import { StartupLayout } from '@/components/startup-layout';
import { initializeDatabase } from '@/database/initialize-database';
import { useLanguage } from '@/hooks/use-language';
import { LanguageProvider } from '@/i18n/language-provider';
//import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <SQLiteProvider
      databaseName="family-budget.db"
      onInit={initializeDatabase}
    >
      <LanguageProvider>
        <AppNavigation />
      </LanguageProvider>
    </SQLiteProvider>
  );
}

function AppNavigation() {
  const colorScheme = useColorScheme();
  const { translations } = useLanguage();

  // useEffect(() => {
  //   if (!__DEV__) {
  //     return;
  //   }

  //   async function checkConnection() {
  //     try {
  //       await apiRequest('/api/exchange-rates');

  //       console.info('Backend connection successful');
  //     } catch (error) {
  //       console.warn('Backend connection failed', error);
  //     }
  //   }

  //   void checkConnection();
  // }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}
      >
        <StartupLayout>
          <Drawer>
            <Drawer.Screen
              name="index"
              options={{
                drawerLabel: translations.home,
                title: translations.home,
                headerShown: false,
                lazy: false,
              }}
            />

            <Drawer.Screen
              name="accounts"
              options={{
                drawerLabel: translations.accounts,
                title: translations.accounts,
                headerShown: false,
                lazy: false,
              }}
            />

            <Drawer.Screen
              name="categories"
              options={{
                drawerLabel: translations.categories,
                title: translations.categories,
                headerShown: false,
                lazy: false,
              }}
            />

            <Drawer.Screen
              name="exchange-rates"
              options={{
                drawerLabel: translations.exchangeRates,
                title: translations.exchangeRates,
                headerShown: false,
                lazy: false,
              }}
            />

            <Drawer.Screen
              name="settings"
              options={{
                drawerLabel: translations.settings,
                title: translations.settings,
                headerShown: false,
                lazy: false,
              }}
            />
          </Drawer>
        </StartupLayout>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}