import { useState } from 'react';
import { Alert } from 'react-native';

import { useLanguage } from '@/hooks/use-language';

type FocusableField = {
  focus: () => void;
};

type FieldRef = {
  readonly current: FocusableField | null;
};

export function useFormErrors<Field extends string>() {
  const { translations } = useLanguage();

  const [errors, setErrors] = useState<
    Partial<Record<Field, string>>
  >({});

  function clearError(field: Field) {
    setErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function showFieldError(
    field: Field,
    message: string,
    ref?: FieldRef,
  ) {
    setErrors((current) => ({
      ...current,
      [field]: message,
    }));

    Alert.alert(
      '',
      message,
      [
        {
          text: translations.ok,
          onPress: () => ref?.current?.focus(),
        },
      ],
      { cancelable: false },
    );
  }

  function showFormError(message: string) {
    Alert.alert(
      '',
      message,
      [{ text: translations.ok }],
      { cancelable: false },
    );
  }

  return {
    errors,
    clearError,
    showFieldError,
    showFormError,
  };
}