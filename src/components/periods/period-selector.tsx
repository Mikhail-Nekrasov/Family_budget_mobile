import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { FieldError } from '@/components/field-error';
import { PeriodWheel, type WheelOption } from '@/components/periods/period-wheel';
import { ScreenBackground } from '@/components/screen-background';
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import type { EntryPeriod } from '@/models/entry-period';
import type { EntryType } from '@/models/entry-type';
import {
  formatEntryPeriod,
  localDateKey,
  MIN_PERIOD_YEAR,
  parsePeriodDate,
  periodBounds,
} from '@/utils/entry-period';

type Props = {
  visible: boolean;
  value: EntryPeriod;
  type: EntryType;
  onApply: (period: EntryPeriod) => void;
  onCancel: () => void;
};

type PickerStage = 'month' | 'year' | 'from' | 'through' | null;

function anchorDate(period: EntryPeriod): Date {
  return period.kind === 'range' ? parsePeriodDate(period.from) : periodBounds(period).from ?? new Date();
}

function rangeFromPeriod(period: EntryPeriod): Extract<EntryPeriod, { kind: 'range' }> {
  if (period.kind === 'range') {
    return period;
  }
  const bounds = periodBounds(period);
  const from = bounds.from ?? new Date();
  const through = bounds.to ? new Date(bounds.to.getTime()) : new Date(from.getTime());
  if (bounds.to) {
    through.setDate(through.getDate() - 1);
  }
  return { kind: 'range', from: localDateKey(from), through: localDateKey(through) };
}

export function PeriodSelector(props: Props) {
  const dark = useColorScheme() === 'dark';
  const background = dark ? '#111722' : '#F5F6F9';
  return (
    <Modal
      visible={props.visible}
      animationType="slide"
      presentationStyle="fullScreen"
      backdropColor={background}
      onRequestClose={props.onCancel}
    >
      {props.visible && (
        <SafeAreaProvider style={{ flex: 1, backgroundColor: background }}>
          <PeriodForm {...props} />
        </SafeAreaProvider>
      )}
    </Modal>
  );
}

function PeriodForm({ value, type, onApply, onCancel }: Props) {
  const { translations, locale } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const [draft, setDraft] = useState<EntryPeriod>(value);
  const [stage, setStage] = useState<PickerStage>(null);
  const [year, setYear] = useState(() => anchorDate(value).getFullYear());
  const [month, setMonth] = useState(() => anchorDate(value).getMonth());
  const [calendarDate, setCalendarDate] = useState(() => anchorDate(value));
  const { errors, clearError, showFieldError } = useFormErrors<'range'>();
  const palette = dark
    ? { card: '#1C2432', text: '#F0F3FA', muted: '#A8B3C5', border: '#333F52', accent: '#A0B8FF', error: '#FF8A80' }
    : { card: '#FFFFFF', text: '#192238', muted: '#6C7890', border: '#E0E5EE', accent: '#365BBC', error: '#C62828' };
  const today = new Date();
  const years: WheelOption[] = Array.from(
    { length: today.getFullYear() - MIN_PERIOD_YEAR + 1 },
    (_, index) => ({ value: MIN_PERIOD_YEAR + index, label: String(MIN_PERIOD_YEAR + index) }),
  );
  const lastMonth = year === today.getFullYear() ? today.getMonth() : 11;
  const selectedMonth = Math.min(month, lastMonth);
  const months: WheelOption[] = Array.from({ length: lastMonth + 1 }, (_, index) => ({
    value: index,
    label: new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2000, index, 15)),
  }));
  const modes = [
    { value: 'month', label: translations.periodMonth },
    { value: 'year', label: translations.periodYear },
    { value: 'all', label: translations.periodAllTime },
    { value: 'range', label: translations.periodCustom },
  ] as const;

  function openWheel(next: 'month' | 'year') {
    const anchor = anchorDate(draft);
    setYear(anchor.getFullYear());
    setMonth(anchor.getMonth());
    setStage(next);
  }

  function openCalendar(next: 'from' | 'through') {
    if (draft.kind !== 'range') {
      return;
    }
    setCalendarDate(parsePeriodDate(draft[next]));
    setStage(next);
  }

  function selectPicker() {
    if (stage === 'month') {
      setDraft({ kind: 'month', year, month: selectedMonth });
    } else if (stage === 'year') {
      setDraft({ kind: 'year', year });
    } else if (stage === 'from' || stage === 'through') {
      try {
        const key = localDateKey(calendarDate);
        setDraft((current) => current.kind === 'range' ? { ...current, [stage]: key } : current);
      } catch {
        showFieldError('range', translations.periodInvalidRange);
        return;
      }
    }
    clearError('range');
    setStage(null);
  }

  function apply() {
    if (draft.kind === 'range' && draft.through > localDateKey(new Date())) {
      showFieldError('range', translations.periodFutureNotAllowed);
      return;
    }
    try {
      periodBounds(draft);
    } catch {
      showFieldError('range', translations.periodInvalidRange);
      return;
    }
    onApply(draft);
  }

  const title = stage === 'from'
    ? translations.periodFrom
    : stage === 'through'
      ? translations.periodThrough
      : stage === 'month'
        ? translations.periodMonth
        : stage === 'year'
          ? translations.periodYear
          : translations.periodTitle;

  function formatDate(date: string): string {
    return new Intl.DateTimeFormat(locale, {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).format(parsePeriodDate(date));
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {stage === 'month' || stage === 'year' ? (
          <View style={styles.wheels}>
            <PeriodWheel label={translations.periodYear} options={years} value={year} onChange={setYear} />
            {stage === 'month' && (
              <PeriodWheel key={months.length} label={translations.periodMonth} options={months} value={selectedMonth} onChange={setMonth} />
            )}
          </View>
        ) : stage === 'from' || stage === 'through' ? (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={[styles.pickerPanel, { backgroundColor: palette.card }]}>
              <ExpoDateTimePicker
                value={calendarDate}
                maximumDate={today}
                mode="date"
                presentation="inline"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                locale={locale.replace(/-/g, '_')}
                themeVariant={dark ? 'dark' : 'light'}
                accentColor={palette.accent}
                onValueChange={(_, selectedDate) => setCalendarDate(selectedDate)}
              />
            </View>
            <AppButton title={translations.today} nativeGlass onPress={() => setCalendarDate(new Date())} />
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <Text style={[styles.description, { color: palette.text }]}>
              {type === 'EXPENSE' ? translations.periodExpensesFor : translations.periodIncomeFor}
            </Text>
            {modes.map((mode) => (
              <Pressable
                key={mode.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: draft.kind === mode.value }}
                onPress={() => {
                  clearError('range');
                  if (mode.value === 'month' || mode.value === 'year') {
                    openWheel(mode.value);
                  } else if (mode.value === 'all') {
                    setDraft({ kind: 'all' });
                  } else {
                    setDraft(rangeFromPeriod(draft));
                  }
                }}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: palette.card,
                    borderColor: draft.kind === mode.value ? palette.accent : palette.border,
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <Text style={[styles.optionLabel, { color: palette.text }]}>{mode.label}</Text>
                <Text accessible={false} style={{ color: palette.accent }}>{draft.kind === mode.value ? '✓' : ''}</Text>
              </Pressable>
            ))}
            {draft.kind === 'range' && (
              <View style={styles.dateFields}>
                {(['from', 'through'] as const).map((field) => (
                  <AppButton
                    key={field}
                    title={`${field === 'from' ? translations.periodFrom : translations.periodThrough}: ${formatDate(draft[field])}`}
                    nativeGlass
                    onPress={() => openCalendar(field)}
                  />
                ))}
              </View>
            )}
            <Text style={[styles.summary, { color: palette.muted }]}>
              {formatEntryPeriod(draft, locale, translations.periodAllTime)}
            </Text>
            <FieldError message={errors.range} />
          </ScrollView>
        )}
        <View style={styles.actions}>
          <AppButton
            title={stage === null ? translations.periodShow : translations.select}
            nativeGlass
            onPress={stage === null ? apply : selectPicker}
          />
          <AppButton
            title={translations.cancel}
            nativeGlass
            onPress={stage === null ? onCancel : () => setStage(null)}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  title: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    fontSize: 24,
    fontWeight: '600',
  },
  content: {
    padding: 20,
    gap: 12,
  },
  description: {
    fontSize: 17,
    marginBottom: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  optionLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  dateFields: {
    gap: 10,
  },
  summary: {
    fontSize: 16,
    textAlign: 'center',
  },
  wheels: {
    flex: 1,
    flexDirection: 'row',
    gap: 16,
    padding: 20,
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
