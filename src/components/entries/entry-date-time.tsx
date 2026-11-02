import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { useLanguage } from '@/hooks/use-language';

type EntryDateTimeProps = {
  value: Date;
  onChange: (value: Date) => void;
  disabled?: boolean;
};

type PickerMode = 'date' | 'time';

export function EntryDateTime({
  value,
  onChange,
  disabled = false,
}: EntryDateTimeProps) {
  const { translations, locale } = useLanguage();
  const dark = useColorScheme() === 'dark';

  const [androidMode, setAndroidMode] =
    useState<PickerMode | null>(null);

  const palette = dark
    ? {
        card: '#1C2432',
        text: '#F0F3FA',
        border: '#333F52',
        accent: '#A0B8FF',
      }
    : {
        card: '#FFFFFF',
        text: '#192238',
        border: '#E0E5EE',
        accent: '#365BBC',
      };

  function updateValue(mode: PickerMode, selected: Date) {
    const next = new Date(value.getTime());

    if (mode === 'date') {
      next.setFullYear(
        selected.getFullYear(),
        selected.getMonth(),
        selected.getDate(),
      );
    } else {
      next.setHours(
        selected.getHours(),
        selected.getMinutes(),
      );
    }

    next.setSeconds(0, 0);
    onChange(next);
  }

  function formatValue(mode: PickerMode): string {
    return new Intl.DateTimeFormat(
      locale,
      mode === 'date'
        ? {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }
        : {
            hour: '2-digit',
            minute: '2-digit',
          },
    ).format(value);
  }

  return (
    <View style={styles.container}>
      {(['date', 'time'] as const).map((mode) => {
        const label = mode === 'date'
          ? translations.entryDate
          : translations.entryTime;

        return (
          <View
            key={mode}
            style={[
              styles.row,
              {
                flex: mode === 'date' ? 1.5 : 1,
                backgroundColor: palette.card,
                borderColor: palette.border,
                opacity: disabled ? 0.45 : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: palette.text },
              ]}
            >
              {label}
            </Text>

            {Platform.OS === 'ios' ? (
              <ExpoDateTimePicker
                value={value}
                mode={mode}
                display="compact"
                locale={locale.replace(/-/g, '_')}
                accentColor={palette.accent}
                disabled={disabled}
                onValueChange={(_, selectedDate) => {
                  updateValue(mode, selectedDate);
                }}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  `${label}: ${formatValue(mode)}`
                }
                disabled={disabled}
                onPress={() => setAndroidMode(mode)}
                style={({ pressed }) => [
                  styles.valueButton,
                  { opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text style={{ color: palette.accent }}>
                  {formatValue(mode)}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {Platform.OS === 'android' &&
        androidMode !== null &&
        !disabled && (
          <ExpoDateTimePicker
            value={value}
            mode={androidMode}
            presentation="dialog"
            accentColor={palette.accent}
            onValueChange={(_, selectedDate) => {
              updateValue(androidMode, selectedDate);
              setAndroidMode(null);
            }}
            onDismiss={() => setAndroidMode(null)}
          />
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: 12,
  },
  label: {
    flexShrink: 0,
    fontSize: 14,
    fontWeight: '600',
  },
  valueButton: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});