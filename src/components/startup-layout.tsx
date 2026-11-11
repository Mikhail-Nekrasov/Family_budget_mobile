import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

const STARTUP_SCREENS = ['home', 'accounts', 'categories', 'exchangeRates', 'settings'] as const;
const STARTUP_TIMEOUT_MS = 2_000;
type StartupScreen = (typeof STARTUP_SCREENS)[number];

export const startupPreloadEnabled = Platform.OS !== 'web';

const StartupContext = createContext<((screen: StartupScreen) => void) | null>(null);

export function StartupLayout({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!startupPreloadEnabled);
  const [progress, setProgress] = useState(0);
  const finished = useRef(false);
  const pending = useRef(new Set<StartupScreen>(STARTUP_SCREENS));

  const markReady = useCallback((screen: StartupScreen) => {
    if (finished.current) return;
    if (!pending.current.delete(screen)) return;

    setProgress((STARTUP_SCREENS.length - pending.current.size) / STARTUP_SCREENS.length);

    if (pending.current.size === 0) {
      finished.current = true;
      if (__DEV__) console.info('[STARTUP] All menu screens laid out');
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => {
      if (finished.current) return;
      finished.current = true;
      if (__DEV__) {
        console.info('[STARTUP] Opening after timeout; pending:', [...pending.current]);
      }
      setReady(true);
    }, STARTUP_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [ready]);

  return (
    <StartupContext.Provider value={startupPreloadEnabled ? markReady : null}>
      {children}
      <AnimatedSplashOverlay ready={ready} progress={progress} />
    </StartupContext.Provider>
  );
}

export function useStartupScreenLayout(screen: StartupScreen, ready: boolean) {
  const markReady = useContext(StartupContext);
  return ready && markReady ? () => markReady(screen) : undefined;
}

export function StartupEmptyLayout({ onLayout }: { onLayout?: () => void }) {
  return onLayout ? (
    <View
      collapsable={false}
      pointerEvents="none"
      onLayout={onLayout}
      style={styles.emptyMarker}
    />
  ) : null;
}

const styles = StyleSheet.create({
  emptyMarker: { position: 'absolute', width: 1, height: 1 },
});
