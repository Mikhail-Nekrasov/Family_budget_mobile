import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { MenuButton } from '@/components/menu-button';
import { useLanguage } from '@/hooks/use-language';

export const unstable_settings = {
  anchor: 'rates',
};

export default function ExchangeRatesLayout() {
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
        name="rates"
        options={{
          title: translations.exchangeRates,
          headerLeft: () => <MenuButton />,
          unstable_headerLeftItems: () => [
            {
              type: 'custom',
              element: <MenuButton />,
              hidesSharedBackground: true,
            },
          ],
        }}
      />
    </Stack>
  );
}