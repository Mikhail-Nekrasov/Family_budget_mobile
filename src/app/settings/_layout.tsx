import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

import { MenuButton } from '@/components/menu-button';
import { useLanguage } from '@/hooks/use-language';

export const unstable_settings = {
  initialRouteName: 'settings',
};

export default function SettingsLayout() {
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
        name="settings"
        options={{
          title: translations.settings,
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

      <Stack.Screen
        name="language"
        options={{
          title: translations.language,
        }}
      />
    </Stack>
  );
}