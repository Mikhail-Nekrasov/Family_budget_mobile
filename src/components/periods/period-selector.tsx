import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppCalendar } from '@/components/calendar/app-calendar';
import { FieldError } from '@/components/field-error';
import { PeriodWheel, type WheelOption } from '@/components/periods/period-wheel';
import { ScreenBackground } from '@/components/screen-background';
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import type { EntryPeriod } from '@/models/entry-period';
import type { EntryType } from '@/models/entry-type';
import { formatCalendarDate } from '@/utils/calendar-date';
import {
  formatEntryPeriod,
  isEntryDateAllowed,
  localDateKey,
  MAX_PERIOD_YEAR,
  MIN_PERIOD_YEAR,
  parsePeriodDate,
  periodBounds,
  weekDates,
} from '@/utils/entry-period';

type Props = {
  visible: boolean;
  value: EntryPeriod;
  rangeOnly?: boolean;
  type: EntryType | 'TRANSFER' | 'SUMMARY';
  onApply: (period: EntryPeriod) => void;
  onCancel: () => void;
};

type PickerStage = 'day' | 'week' | 'month' | 'year' | 'from' | 'through' | null;

function anchorDate(period: EntryPeriod): Date {
  return period.kind === 'range' ? parsePeriodDate(period.from) : periodBounds(period).from ?? new Date();
}

function rangeFromPeriod(period: EntryPeriod): Extract<EntryPeriod, { kind: 'range' }> {
  if (period.kind === 'range') {
    return period;
  }
  const today = new Date();
  const from = new Date(today.getTime());
  from.setMonth(0, 1);
  return {
    kind: 'range',
    from: localDateKey(from),
    through: localDateKey(today),
  };
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

function PeriodForm({ value, type, rangeOnly = false, onApply, onCancel }: Props) {
  const { translations, locale } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const [draft, setDraft] = useState<EntryPeriod>(() => rangeOnly ? rangeFromPeriod(value) : value);
  const [stage, setStage] = useState<PickerStage>(null);
  const [year, setYear] = useState(() => anchorDate(value).getFullYear());
  const [month, setMonth] = useState(() => anchorDate(value).getMonth());
  const [calendarDate, setCalendarDate] = useState(() => anchorDate(value));
  const { errors, clearError, showFieldError } = useFormErrors<'range'>();
  const palette = dark
    ? { card: '#1C2432', text: '#F0F3FA', muted: '#A8B3C5', border: '#333F52', accent: '#A0B8FF', error: '#FF8A80' }
    : { card: '#FFFFFF', text: '#192238', muted: '#6C7890', border: '#E0E5EE', accent: '#365BBC', error: '#C62828' };
const [today] = useState(() => new Date());

const currentYear = Math.min(
  MAX_PERIOD_YEAR,
  today.getFullYear(),
);

const years = useMemo<WheelOption[]>(() => Array.from(
  { length: currentYear - MIN_PERIOD_YEAR + 1 },
  (_, index) => ({
    value: MIN_PERIOD_YEAR + index,
    label: String(MIN_PERIOD_YEAR + index),
  }),
), [currentYear]);

const lastMonth = year === today.getFullYear()
  ? today.getMonth()
  : 11;

const selectedMonth = Math.min(month, lastMonth);
  const months = useMemo<WheelOption[]>(() => {
    const formatter = new Intl.DateTimeFormat(locale, { month: 'long' });
    return Array.from({ length: lastMonth + 1 }, (_, index) => ({
      value: index,
      label: formatter.format(new Date(2000, index, 15)),
    }));
  }, [locale, lastMonth]);

  const modes = [
    { value: 'day', label: translations.periodDay },
    { value: 'week', label: translations.periodWeek },
    { value: 'month', label: translations.periodMonth },
    { value: 'year', label: translations.periodYear },
    { value: 'range', label: translations.periodCustom },
    { value: 'all', label: translations.periodAllTime },
  ] as const;

  function openWheel(next: 'month' | 'year') {
    const anchor = anchorDate(draft);
    setYear(anchor.getFullYear());
    setMonth(anchor.getMonth());
    setStage(next);
  }

  function openCalendar(
    next: 'day' | 'week' | 'from' | 'through',
  ) {
    if (next === 'from' || next === 'through') {
      if (draft.kind !== 'range') {
        return;
      }

      setCalendarDate(parsePeriodDate(draft[next]));
    } else {
      setCalendarDate(
        draft.kind === next
          ? parsePeriodDate(draft.date)
          : new Date(),
      );
    }

    setStage(next);
  }

  function selectPicker() {
    if (stage === 'month') {
      setDraft({
        kind: 'month',
        year,
        month: selectedMonth,
      });
    } else if (stage === 'year') {
      setDraft({
        kind: 'year',
        year,
      });
    } else if (
      stage === 'day' ||
      stage === 'week' ||
      stage === 'from' ||
      stage === 'through'
    ) {
      if (!isEntryDateAllowed(calendarDate)) {
        showFieldError(
          'range',
          translations.entryDateInvalid(MIN_PERIOD_YEAR),
        );
        return;
      }

      const key = localDateKey(calendarDate);

      if (stage === 'day' || stage === 'week') {
        setDraft({
          kind: stage,
          date: stage === 'week'
            ? localDateKey(weekDates(key).from)
            : key,
        });
      } else {
        setDraft((current) =>
          current.kind === 'range'
            ? {
                ...current,
                [stage]: key,
              }
            : current,
        );
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

  const title = stage === 'day'
    ? translations.periodDay
    : stage === 'week'
      ? translations.periodWeek
      : stage === 'from'
        ? translations.periodFrom
        : stage === 'through'
          ? translations.periodThrough
          : stage === 'month'
            ? translations.periodMonth
            : stage === 'year'
              ? translations.periodYear
              : translations.periodTitle;

  function formatDate(date: string): string {
    return formatCalendarDate(
      parsePeriodDate(date),
      locale,
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen}>
        <Text style={[styles.title, { color: palette.text }]}>{title}</Text>
        {stage === 'month' || stage === 'year' ? (
          <View style={styles.wheels}>
            {stage === 'month' && (
              <PeriodWheel
                key={months.length}
                label={translations.periodMonth}
                options={months}
                value={selectedMonth}
                onChange={setMonth}
                cyclic
              />
            )}
            <PeriodWheel
              label={translations.periodYear}
              options={years}
              value={year}
              onChange={setYear}
            />
          </View>
        ) : (
          stage === 'day' ||
          stage === 'week' ||
          stage === 'from' ||
          stage === 'through'
        ) ? (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <AppCalendar
              value={calendarDate}
              onChange={setCalendarDate}
            />

            {stage === 'week' && (
              <Text
                style={[
                  styles.summary,
                  { color: palette.muted },
                ]}
              >
                {formatEntryPeriod(
                  {
                    kind: 'week',
                    date: localDateKey(calendarDate),
                  },
                  locale,
                  translations.periodAllTime,
                )}
              </Text>
            )}
          </ScrollView>
        ) : (
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {type !== 'SUMMARY' && (
              <Text style={[styles.description, { color: palette.text }]}>
                {type === 'TRANSFER'
                  ? translations.periodTransfersFor
                  : type === 'EXPENSE' ? translations.periodExpensesFor : translations.periodIncomeFor}
              </Text>
            )}
            {!rangeOnly && modes.map((mode) => (
              <Pressable
                key={mode.value}
                accessibilityRole="radio"
                accessibilityState={{ checked: draft.kind === mode.value }}
                onPress={() => {
                  clearError('range');

                  if (
                    mode.value === 'day' ||
                    mode.value === 'week'
                  ) {
                    openCalendar(mode.value);
                  } else if (
                    mode.value === 'month' ||
                    mode.value === 'year'
                  ) {
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
                    keepTitleCentered
                    rightIcon="calendar"
                    nativeGlass
                    onPress={() => openCalendar(field)}
                  />
                ))}
              </View>
            )}
            <Text style={[styles.summary, { color: palette.muted }]}>
              {formatEntryPeriod(draft, locale, translations.periodAllTime)}
            </Text>
            {rangeOnly && (
              <AppButton
                title={translations.periodAllTime}
                keepTitleCentered
                nativeGlass
                onPress={() => onApply({ kind: 'all' })}
              />
            )}
            <FieldError message={errors.range} />
          </ScrollView>
        )}
        <View style={styles.actions}>
          <AppButton
            title={stage === null ? translations.periodShow : translations.select}
            keepTitleCentered
            rightIcon="check"
            nativeGlass
            onPress={stage === null ? apply : selectPicker}
          />
          <AppButton
            title={translations.cancel}
            keepTitleCentered
            rightIcon="cancel"
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
