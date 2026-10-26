import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <Drawer>
          <Drawer.Screen
            name="index"
            options={{ drawerLabel: 'Главная', title: 'Главная', headerShown: false }}
          />
          <Drawer.Screen
            name="explore"
            options={{ drawerItemStyle: { display: 'none' } }}
          />
        </Drawer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
