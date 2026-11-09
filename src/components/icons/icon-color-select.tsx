import { useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import {
  ACCOUNT_ICON_COLOR_ROWS,
  ICON_COLOR_ROWS,
  QUICK_ACCOUNT_ICON_COLORS,
  QUICK_ICON_COLORS,
  iconForeground,
} from '@/constants/icon-colors';
import { useLanguage } from '@/hooks/use-language';

type Props = {
  palette: 'account' | 'category';
  value: string | null;
  onChange: (value: string | null) => void;
  disabled?: boolean;
};

export function IconColorSelect({ palette, value, onChange, disabled = false }: Props) {
  const { translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const background = dark ? '#111722' : '#F5F6F9';
  const text = dark ? '#F0F3FA' : '#192238';
  const accent = dark ? '#A0B8FF' : '#365BBC';
  const [expanded, setExpanded] = useState(false);
  const [pending, setPending] = useState(value);
  const isAccount = palette === 'account';
  const rows = isAccount ? ACCOUNT_ICON_COLOR_ROWS : ICON_COLOR_ROWS;
  const quick: string[] = [
    ...(isAccount ? QUICK_ACCOUNT_ICON_COLORS : QUICK_ICON_COLORS),
  ];
  if (value !== null && !quick.includes(value)) quick[3] = value;

  function swatch(color: string | null, modal = false) {
    const selected = color === (modal ? pending : value);
    return (
      <Pressable
        key={color ?? 'none'}
        accessibilityRole="radio"
        accessibilityLabel={color ? `${translations.iconColor}: ${color}` : translations.noIconColor}
        accessibilityState={{ checked: selected, disabled }}
        disabled={disabled}
        onPress={() => {
          Keyboard.dismiss();
          if (modal) setPending(color); else onChange(color);
        }}
        style={({ pressed }) => [styles.cell, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}
      >
        <View style={[styles.ring, { borderColor: selected ? accent : 'transparent' }]}>
          <View style={[
            styles.color,
            color
              ? { backgroundColor: color }
              : { borderWidth: 1, borderColor: text },
          ]}>
            {color === null ? (
              <Text style={{ color: text, fontSize: 18 }}>∅</Text>
            ) : selected ? (
              <Text style={{ color: iconForeground(color), fontWeight: '600' }}>✓</Text>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  }

  return (
    <>
      <Text style={[styles.label, { color: text }]}>{translations.iconColor}</Text>
      <View style={styles.row}>
        {quick.map((color) => swatch(color))}
        {swatch(null)}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={translations.moreColors}
          disabled={disabled}
          onPress={() => {
            Keyboard.dismiss();
            setPending(value);
            setExpanded(true);
          }}
          style={({ pressed }) => [styles.cell, { opacity: disabled ? 0.45 : pressed ? 0.7 : 1 }]}
        >
          <View style={[styles.more, { borderColor: accent }]}>
            <Text style={{ color: accent }}>…</Text>
          </View>
        </Pressable>
      </View>
      <Modal visible={expanded} animationType="slide" presentationStyle="fullScreen" backdropColor={background} onRequestClose={() => setExpanded(false)}>
        {expanded && (
          <SafeAreaProvider style={[styles.screen, { backgroundColor: background }]}>
            <ScreenBackground>
              <SafeAreaView style={styles.screen}>
                <Text style={[styles.title, { color: text }]}>{translations.iconColor}</Text>
                <ScrollView style={styles.screen} contentContainerStyle={styles.palette}>
                  {rows.map((row) => (
                    <View key={row[0]} style={styles.paletteRow}>
                      {row.map((color) => swatch(color, true))}
                    </View>
                  ))}
                </ScrollView>
                <View style={styles.actions}>
                  <AppButton
                  title={translations.select}
                  keepTitleCentered
                  rightIcon="check"
                  nativeGlass
                  disabled={disabled}
                  onPress={() => { onChange(pending); setExpanded(false); }}
                />
                  <AppButton
                    title={translations.cancel}
                    keepTitleCentered
                    rightIcon="cancel"
                    nativeGlass
                    onPress={() => setExpanded(false)}
                  />
                </View>
              </SafeAreaView>
            </ScreenBackground>
          </SafeAreaProvider>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  label: { fontSize: 15, fontWeight: '600' },
  row: { flexDirection: 'row' },
  cell: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  ring: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  color: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  more: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  palette: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 8 },
  paletteRow: { flex: 1, flexDirection: 'row', minHeight: 48 },
  title: { padding: 20, fontSize: 24, fontWeight: '600' },
  actions: { padding: 20, gap: 12 },
});
