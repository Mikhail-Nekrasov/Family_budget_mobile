import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppCalendar } from '@/components/calendar/app-calendar';
import { ScreenBackground } from '@/components/screen-background';
import { useLanguage } from '@/hooks/use-language';
import { formatCalendarDate } from '@/utils/calendar-date';

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

  const [mode, setMode] = useState<PickerMode | null>(null);
  const [draft, setDraft] = useState(() => new Date(value.getTime()));

  const palette = dark
    ? {
        background: '#111722',
        card: '#1C2432',
        text: '#F0F3FA',
        border: '#333F52',
        accent: '#A0B8FF',
      }
    : {
        background: '#F5F6F9',
        card: '#FFFFFF',
        text: '#192238',
        border: '#E0E5EE',
        accent: '#365BBC',
      };

  function openPicker(nextMode: PickerMode) {
    if (disabled) {
      return;
    }

    Keyboard.dismiss();
    setDraft(new Date(value.getTime()));
    setMode(nextMode);
  }

  function closePicker() {
    setMode(null);
  }

  function updateDraft(selected: Date) {
    setDraft((current) => {
      const next = new Date(current.getTime());

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
      return next;
    });
  }

  function selectNow() {
    const now = new Date();

    setDraft((current) => {
      const next = new Date(current.getTime());

      next.setHours(
        now.getHours(),
        now.getMinutes(),
        0,
        0,
      );

      return next;
    });
  }

  function confirmSelection() {
    if (disabled) {
      return;
    }

    onChange(new Date(draft.getTime()));
    closePicker();
  }

  function formatValue(
    date: Date,
    pickerMode: PickerMode,
  ): string {
    if (pickerMode === 'date') {
      return formatCalendarDate(date, locale);
    }

    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return (
    <>
      <View style={styles.container}>
        {(['date', 'time'] as const).map((pickerMode) => {
          const label = pickerMode === 'date'
            ? translations.entryDate
            : translations.entryTime;

          return (
            <Pressable
              key={pickerMode}
              accessibilityRole="button"
              accessibilityLabel={
                `${label}: ${formatValue(value, pickerMode)}`
              }
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={() => openPicker(pickerMode)}
              style={({ pressed }) => [
                styles.field,
                {
                  flex: pickerMode === 'date' ? 1.5 : 1,
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                  opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: palette.text },
                ]}
              >
                {label}
              </Text>

              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
                style={[
                  styles.value,
                  { color: palette.accent },
                ]}
              >
                {formatValue(value, pickerMode)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Modal
        visible={mode !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        backdropColor={palette.background}
        onRequestClose={closePicker}
      >
        {mode !== null && (
          <SafeAreaProvider
            style={[
              styles.screen,
              { backgroundColor: palette.background },
            ]}
          >
            <ScreenBackground>
              <SafeAreaView style={styles.screen}>
                <ScrollView
                  contentContainerStyle={styles.content}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text
                    style={[
                      styles.title,
                      { color: palette.text },
                    ]}
                  >
                    {mode === 'date'
                      ? translations.entryDate
                      : translations.entryTime}
                  </Text>

                  {mode === 'date' ? (
                    <AppCalendar
                      value={draft}
                      disabled={disabled}
                      onChange={updateDraft}
                    />
                  ) : (
                    <>
                      <View
                        style={[
                          styles.pickerPanel,
                          { backgroundColor: palette.card },
                        ]}
                      >
                        <ExpoDateTimePicker
                          value={draft}
                          mode="time"
                          presentation="inline"
                          display={
                            Platform.OS === 'ios'
                              ? 'spinner'
                              : 'default'
                          }
                          locale={locale.replace(/-/g, '_')}
                          themeVariant={dark ? 'dark' : 'light'}
                          accentColor={palette.accent}
                          onValueChange={(_, selectedDate) =>
                            updateDraft(selectedDate)
                          }
                        />
                      </View>

                      <AppButton
                        title={translations.now}
                        nativeGlass
                        onPress={selectNow}
                      />
                    </>
                  )}
                </ScrollView>

                <View style={styles.actions}>
                  <AppButton
                    title={translations.select}
                    nativeGlass
                    disabled={disabled}
                    onPress={confirmSelection}
                  />

                  <AppButton
                    title={translations.cancel}
                    nativeGlass
                    onPress={closePicker}
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
  screen: {
    flex: 1,
  },
  container: {
    flexDirection: 'row',
    gap: 8,
  },
  field: {
    flexDirection: 'row',
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 12,
  },
  label: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  content: {
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  pickerPanel: {
    padding: 8,
    borderRadius: 16,
  },
  actions: {
    padding: 20,
    gap: 12,
  },
});