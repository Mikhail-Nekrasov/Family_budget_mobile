import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { AccountOverviewButton } from '@/components/accounts/account-overview-button';
import { MenuButton } from '@/components/menu-button';
import { useLanguage } from '@/hooks/use-language';

export const unstable_settings = {
  anchor: 'accounts',
};

export default function AccountsLayout() {
  const { translations } = useLanguage();
  const dark = useColorScheme() === 'dark';

  return (
    <Stack
      screenOptions={{
        headerTintColor: dark ? '#F0F3FA' : '#192238',
        headerStyle: {
          backgroundColor: dark ? '#111722' : '#F5F6F9',
        },
      }}
    >
      <Stack.Screen
        name="accounts"
        options={{
          title: translations.accounts,
          headerLeft: () => <MenuButton />,
          headerRight: () => <AccountOverviewButton />,
          unstable_headerRightItems: () => [
            {
              type: 'custom',
              element: <AccountOverviewButton />,
              hidesSharedBackground: true,
            },
          ],
          unstable_headerLeftItems: () => [
            {
              type: 'custom',
              element: <MenuButton />,
              hidesSharedBackground: true,
            },
          ],
        }}
      />
      <Stack.Screen
        name="transfer-history"
        options={{
          title: translations.transferHistory,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <Stack.Screen
        name="overview"
        options={{
          title: translations.accountOverview,
          headerTransparent: true,
          headerShadowVisible: true,
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
    </Stack>
  );
}