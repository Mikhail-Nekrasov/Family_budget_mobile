import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';

import { useLanguage } from '@/hooks/use-language';

export function FormHeader({ title, onBack, disabled }: {
  title: string; onBack: () => void; disabled: boolean;
}) {
  const { language } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const color = dark ? '#F0F3FA' : '#192238';
  const nativeGlass = isGlassEffectAPIAvailable() && isLiquidGlassAvailable();
  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: dark ? '#111722' : '#F5F6F9' }}>
      <View style={[styles.header, { borderBottomColor: dark ? '#333F52' : '#E0E5EE' }]}>
      <Pressable accessibilityRole="button"
        accessibilityLabel={{ en: 'Back', ru: 'Назад', fi: 'Takaisin', fr: 'Retour', es: 'Atrás' , vi: "Quay lại" }[language]}
        disabled={disabled} onPress={onBack}
        style={({ pressed }) => [styles.button, { opacity: disabled ? 0.4 : pressed ? 0.65 : 1 }]}>
        {nativeGlass
          ? <GlassView pointerEvents="none" glassEffectStyle="regular" style={StyleSheet.absoluteFill} />
          : <BlurView pointerEvents="none" intensity={35} tint={dark ? 'dark' : 'light'}
              style={StyleSheet.absoluteFill} />}
        <Svg width={22} height={28} viewBox="0 0 22 28" accessible={false}>
          <Path d="M15 4L5 14l10 10" fill="none" stroke={color} strokeWidth={2.5}
            strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
      <Text accessibilityRole="header" style={[styles.title, { color }]}>{title}</Text>
      <View style={styles.balance} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 56,
    paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth },
  button: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center', borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(140, 150, 170, 0.35)' },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600' },
  balance: { width: 44 },
});
