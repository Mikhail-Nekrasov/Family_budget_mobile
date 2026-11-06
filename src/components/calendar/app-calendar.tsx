import ExpoDateTimePicker from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import {
    Platform,
    StyleSheet,
    useColorScheme,
    View,
} from 'react-native';

import { AppButton } from '@/components/app-button';
import { FieldError } from '@/components/field-error';
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import {
    fromCalendarPickerDate,
    toCalendarPickerDate,
} from '@/utils/calendar-date';
import {
    entryDateLimits,
    isEntryDateAllowed,
    MIN_PERIOD_YEAR,
} from '@/utils/entry-period';

type Props = {
  value: Date;
  onChange: (value: Date) => void;
  disabled?: boolean;
};

export function AppCalendar({
  value,
  onChange,
  disabled = false,
}: Props) {
  const { translations, locale } = useLanguage();
  const dark = useColorScheme() === 'dark';

  const [revision, setRevision] = useState(0);

  const {
    errors,
    clearError,
    showFieldError,
  } = useFormErrors<'date'>();

  const utc = Platform.OS === 'ios';
  const limits = entryDateLimits();

  const minimumDate = toCalendarPickerDate(
    limits.minimumDate,
    utc,
  );

  const maximumDate = toCalendarPickerDate(
    limits.maximumDate,
    utc,
  );

  if (utc) {
    minimumDate.setUTCHours(0, 0, 0, 0);
    maximumDate.setUTCHours(23, 59, 59, 999);
  } else {
    minimumDate.setHours(0, 0, 0, 0);
    maximumDate.setHours(23, 59, 59, 999);
  }

  function selectDate(selected: Date) {
    if (disabled) {
      return;
    }

    const next = fromCalendarPickerDate(selected, utc);

    if (!isEntryDateAllowed(next)) {
      showFieldError(
        'date',
        translations.entryDateInvalid(MIN_PERIOD_YEAR),
      );

      // Восстанавливаем последнюю принятую дату,
      // если системный календарь пропустил недопустимую.
      setRevision((current) => current + 1);
      return;
    }

    clearError('date');
    onChange(next);
  }

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.panel,
          {
            backgroundColor: dark
              ? '#1C2432'
              : '#FFFFFF',
          },
        ]}
      >
        <ExpoDateTimePicker
          key={revision}
          value={toCalendarPickerDate(value, utc)}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          mode="date"
          presentation="inline"
          display={
            Platform.OS === 'ios'
              ? 'inline'
              : 'default'
          }
          timeZoneName={utc ? 'UTC' : undefined}
          locale={locale.replace(/-/g, '_')}
          themeVariant={dark ? 'dark' : 'light'}
          accentColor={dark ? '#A0B8FF' : '#365BBC'}
          disabled={disabled}
          onValueChange={(_, selectedDate) =>
            selectDate(selectedDate)
          }
        />
      </View>

      <FieldError message={errors.date} />

      <AppButton
        title={translations.today}
        nativeGlass
        disabled={disabled}
        onPress={() => {
          clearError('date');

          onChange(
            toCalendarPickerDate(new Date(), false),
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  panel: {
    padding: 8,
    borderRadius: 16,
  },
});