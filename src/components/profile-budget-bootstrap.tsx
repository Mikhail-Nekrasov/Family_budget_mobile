import { addNetworkStateListener, getNetworkStateAsync } from 'expo-network';
import * as SplashScreen from 'expo-splash-screen';
import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { useBudgetAuth } from '@/components/budget-auth';
import { ScreenBackground } from '@/components/screen-background';
import { useLanguage } from '@/hooks/use-language';
import {
  initializeProfileBudget,
  isProfileBudgetInitialized,
  UnsupportedSharedBudgetError,
} from '@/services/initialize-profile-budget';

const messages = {
  en: {
    loading: 'Loading your budget…',
    offline: 'Connect to the internet to load your budget on this device.',
    failed: 'Could not load your budget. Try again.',
    shared: 'This version cannot load a budget with shared accounts.',
  },
  ru: {
    loading: 'Загружаем бюджет…',
    offline: 'Подключись к интернету, чтобы загрузить бюджет на это устройство.',
    failed: 'Не удалось загрузить бюджет. Попробуй ещё раз.',
    shared: 'Эта версия не поддерживает загрузку бюджета с общими счетами.',
  },
  fi: {
    loading: 'Ladataan budjettia…',
    offline: 'Yhdistä internetiin, jotta budjetti voidaan ladata tälle laitteelle.',
    failed: 'Budjettia ei voitu ladata. Yritä uudelleen.',
    shared: 'Tämä versio ei voi ladata budjettia, jossa on jaettuja tilejä.',
  },
};

export function ProfileBudgetBootstrap({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const { user, text, busy, needsSignIn, reauthenticate, signOut, withBudgetSession } = useBudgetAuth();
  const { language } = useLanguage();
  const color = useColorScheme() === 'dark' ? '#F0F3FA' : '#192238';
  const [progress, setProgress] = useState<'checking' | 'ready' | keyof typeof messages.en>('checking');
  const [retry, setRetry] = useState(0);
  const userId = user?.userId;
  const ready = progress === 'ready';

  useEffect(() => {
    if (!userId || ready) return;
    let active = true;
    let running = false;

    async function start() {
      if (!active || running || !userId) return;
      running = true;
      try {
        if (await isProfileBudgetInitialized(database)) {
          if (active) setProgress('ready');
          return;
        }
        if (!active) return;
        if (needsSignIn) {
          setProgress('failed');
          return;
        }

        const network = await getNetworkStateAsync();
        if (!active) return;
        if (network.isConnected === false || network.isInternetReachable === false) {
          setProgress('offline');
          return;
        }

        setProgress('loading');
        await withBudgetSession(userId, (headers) => initializeProfileBudget(database, headers));
        if (active) setProgress('ready');
      } catch (error) {
        if (active) setProgress(error instanceof UnsupportedSharedBudgetError ? 'shared' : 'failed');
      } finally {
        running = false;
      }
    }

    void start();
    const subscription = addNetworkStateListener((network) => {
      if (network.isConnected && network.isInternetReachable !== false) void start();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [database, needsSignIn, ready, retry, userId, withBudgetSession]);

  useEffect(() => {
    if (progress !== 'checking' && progress !== 'ready') {
      void SplashScreen.hideAsync().catch(() => undefined);
    }
  }, [progress]);

  if (progress === 'ready') return children;
  if (progress === 'checking') return null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.content}>
        <Text accessibilityLiveRegion="polite" style={{ color }}>{messages[language][progress]}</Text>
        {progress === 'loading' ? <ActivityIndicator color={color} /> : needsSignIn
          ? <AppButton title={text.signInAgain} onPress={reauthenticate} disabled={busy} />
          : <AppButton title={text.retry} onPress={() => setRetry((previous) => previous + 1)} disabled={busy} />}
        <AppButton title={text.signOut} onPress={signOut} disabled={busy} />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 24, justifyContent: 'center', gap: 14 },
});
