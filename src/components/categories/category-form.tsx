import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState, type ComponentRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { CategoryIcon } from '@/components/categories/category-icon';
import { CompactIconSelect } from '@/components/compact-icon-select';
import { FieldError } from '@/components/field-error';
import { ScreenBackground } from '@/components/screen-background';
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import type { Category } from '@/models/category';
import type { EntryType } from '@/models/entry-type';
import { createCategory } from '@/repositories/category-repository';

const CATEGORY_ICON_KEYS = [
  'category',
  'groceries',
  'housing',
  'transport',
  'food',
  'salary',
  'leisure',
  'health',
] as const;

type CategoryFormProps = {
  type: EntryType;
  onSaved: (category: Category) => void;
  onCancel: () => void;
};

export function CategoryForm({
  type,
  onSaved,
  onCancel,
}: CategoryFormProps) {
  const database = useSQLiteContext();
  const { translations } = useLanguage();

  const [name, setName] = useState('');

  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);

  const {
    errors,
    clearError,
    showFieldError,
    showFormError,
  } = useFormErrors<'name'>();

  const [iconKey, setIconKey] = useState<string>('category');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        card: '#1C2432',
        text: '#F0F3FA',
        muted: '#A8B3C5',
        border: '#333F52',
        error: '#FF8A80',
      }
    : {
        card: '#FFFFFF',
        text: '#192238',
        muted: '#6C7890',
        border: '#E0E5EE',
        error: '#C62828',
      };

  async function saveCategory() {
    if (savingRef.current) {
      return;
    }

    if (name.trim().length === 0) {
      showFieldError(
        'name',
        translations.categoryNameRequired,
        nameRef,
      );
      return;
    }

    savingRef.current = true;
    setSaving(true);

    let createdCategory: Category;

    try {
      createdCategory = await createCategory(database, {
        name,
        type,
        iconKey,
      });
    } catch (error) {
      console.warn('Failed to save category', error);

      showFormError(translations.saveCategoryError);
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    onSaved(createdCategory);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen}>
        <KeyboardAvoidingView
          style={styles.screen}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <Text
              style={[
                styles.title,
                { color: palette.text },
              ]}
            >
              {translations.newCategory}
            </Text>

            <Text
              style={[
                styles.type,
                { color: palette.muted },
              ]}
            >
              {type === 'EXPENSE'
                ? translations.expenses
                : translations.income}
            </Text>

            <Text
              style={[
                styles.label,
                { color: palette.text },
              ]}
            >
              {translations.categoryName}
            </Text>

            <TextInput
              ref={nameRef}
              accessibilityLabel={translations.categoryName}
              value={name}
              onChangeText={(text) => {
                setName(text);
                clearError('name');
              }}
              editable={!saving}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              style={[
                styles.input,
                {
                  color: palette.text,
                  backgroundColor: palette.card,
                  borderColor: errors.name
                    ? palette.error
                    : palette.border,
                },
              ]}
            />

            <FieldError message={errors.name} />

            <Text
              style={[
                styles.label,
                { color: palette.text },
              ]}
            >
              {translations.categoryIcon}
            </Text>

            <CompactIconSelect
              title={translations.categoryIcon}
              options={CATEGORY_ICON_KEYS.map((key) => ({
                value: key,
                label: translations.categoryIcons[key],
              }))}
              value={iconKey}
              onChange={setIconKey}
              disabled={saving}
              renderIcon={(key, color, size) => (
                <CategoryIcon
                  iconKey={key}
                  color={color}
                  size={size}
                />
              )}
            />

            <View style={styles.actions}>
              <AppButton
                title={
                  saving
                    ? translations.saving
                    : translations.save
                }
                nativeGlass
                disabled={saving}
                onPress={() => void saveCategory()}
              />

              <AppButton
                title={translations.cancel}
                nativeGlass
                disabled={saving}
                onPress={onCancel}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  type: {
    fontSize: 16,
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
});