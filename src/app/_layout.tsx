import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { SQLiteProvider } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { Text, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AppButton } from '@/components/app-button';
import { AutomaticBudgetUpload } from '@/components/automatic-budget-upload';
import { BudgetAuthProvider, useBudgetAuth } from '@/components/budget-auth';
import { ProfileBudgetBootstrap } from '@/components/profile-budget-bootstrap';
import { ScreenBackground } from '@/components/screen-background';
import { StartupLayout } from '@/components/startup-layout';
import { initializeDatabase } from '@/database/initialize-database';
import { useLanguage } from '@/hooks/use-language';
import { DrawerIcon } from '@/components/icons/drawer-icon';
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

const profileDatabaseOptions = { enableChangeListener: true };

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
    <SQLiteProvider databaseName={databaseName} options={profileDatabaseOptions} onInit={initializeDatabase} onError={() => setFailed(true)}>
      <ProfileBudgetBootstrap>
        <AutomaticBudgetUpload>
          <AppNavigation />
        </AutomaticBudgetUpload>
      </ProfileBudgetBootstrap>
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
        <Drawer
          screenOptions={{
            drawerLabelStyle: { fontSize: 18, fontWeight: '500' },
            drawerItemStyle: { minHeight: 56, borderRadius: 14, marginHorizontal: 12, marginVertical: 4 },
            drawerActiveTintColor: colorScheme === 'dark' ? '#A9BAFF' : '#365CB8',
            drawerInactiveTintColor: colorScheme === 'dark' ? '#DFE6F8' : '#273142',
            drawerActiveBackgroundColor: colorScheme === 'dark' ? '#26334C' : '#E7EDFC',
          }}
        >
          <Drawer.Screen
            name="index"
            options={{
              drawerLabel: translations.home,
              drawerIcon: ({ color }) => <DrawerIcon name="home" color={color} />,
              title: translations.home,
              headerShown: false,
              lazy: false,
            }}
          />

          <Drawer.Screen
            name="accounts"
            options={{
              drawerLabel: translations.accounts,
              drawerIcon: ({ color }) => <DrawerIcon name="accounts" color={color} />,
              title: translations.accounts,
              headerShown: false,
              lazy: false,
            }}
          />

          <Drawer.Screen
            name="categories"
            options={{
              drawerLabel: translations.categories,
              drawerIcon: ({ color }) => <DrawerIcon name="categories" color={color} />,
              title: translations.categories,
              headerShown: false,
              lazy: false,
            }}
          />

          <Drawer.Screen
            name="exchange-rates"
            options={{
              drawerLabel: translations.exchangeRates,
              drawerIcon: ({ color }) => <DrawerIcon name="exchange" color={color} />,
              title: translations.exchangeRates,
              headerShown: false,
              lazy: false,
            }}
          />

          <Drawer.Screen
            name="analytics"
            options={{
              drawerLabel: translations.analytics,
              drawerIcon: ({ color }) => <DrawerIcon name="analytics" color={color} />,
              title: translations.analytics,
              headerShown: false,
            }}
          />

          <Drawer.Screen
            name="settings"
            options={{
              drawerLabel: translations.settings,
              drawerIcon: ({ color }) => <DrawerIcon name="settings" color={color} />,
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