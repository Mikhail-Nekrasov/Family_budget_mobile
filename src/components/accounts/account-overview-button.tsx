import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View, useColorScheme } from 'react-native';

import { ActionIcon } from '@/components/icons/action-icon';
import { useLanguage } from '@/hooks/use-language';

export function AccountOverviewButton() {
  const { translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const nativeGlass = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={translations.accountOverview}
      onPress={() => router.push('/accounts/overview')}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
      ]}
    >
      {nativeGlass ? (
        <GlassView pointerEvents="none" glassEffectStyle="regular" style={styles.glass} />
      ) : (
        <View pointerEvents="none" style={[styles.glass, { backgroundColor: dark ? '#1C2432' : '#FFFFFF' }]} />
      )}
      <ActionIcon name="chest" color={dark ? '#F0F3FA' : '#192238'} size={22} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
  },
  glass: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  pressed: { opacity: 0.75 },
});
