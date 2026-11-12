import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { MenuButton } from '@/components/menu-button';
import { useLanguage } from '@/hooks/use-language';

export const unstable_settings = {
  anchor: 'overview',
};

export default function AnalyticsLayout() {
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
        name="overview"
        options={{
          title: translations.analytics,
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
      <Stack.Screen name="entries" options={{ headerBackButtonDisplayMode: 'minimal' }} />
    </Stack>
  );
}