import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Text, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppButton } from '@/components/app-button';
import { BudgetAuthProvider, useBudgetAuth } from '@/components/budget-auth';
import { ScreenBackground } from '@/components/screen-background';
import { StartupLayout } from '@/components/startup-layout';
import { initializeDatabase } from '@/database/initialize-database';
import { useLanguage } from '@/hooks/use-language';
import { LanguageProvider } from '@/i18n/language-provider';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <LanguageProvider>
        <BudgetAuthProvider>
          <ProfileBudget />
        </BudgetAuthProvider>
      </LanguageProvider>
    </GestureHandlerRootView>
  );
}

function ProfileBudget() {
  const { databaseName } = useBudgetAuth();
  return databaseName ? <ProfileDatabase key={databaseName} databaseName={databaseName} /> : null;
}

function ProfileDatabase({ databaseName }: { databaseName: string }) {
  const { text, signOut } = useBudgetAuth();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (failed) void SplashScreen.hideAsync().catch(() => undefined);
  }, [failed]);
  if (failed) {
    return (
      <ScreenBackground>
        <Text style={{ margin: 24 }}>{text.storageError}</Text>
        <AppButton title={text.retry} onPress={() => setFailed(false)} />
        <AppButton title={text.signOut} onPress={signOut} />
      </ScreenBackground>
    );
  }
  return (
    <SQLiteProvider databaseName={databaseName} onInit={initializeDatabase} onError={() => setFailed(true)}>
      <AppNavigation />
    </SQLiteProvider>
  );
}

function AppNavigation() {
  const colorScheme = useColorScheme();
  const { translations } = useLanguage();

  return (
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
            name="analytics"
            options={{
              drawerLabel: translations.analytics,
              title: translations.analytics,
              headerShown: false,
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
  );
}