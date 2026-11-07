import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { CategoryIcon } from '@/components/categories/category-icon';
import { CompactIconSelect } from '@/components/compact-icon-select';
import { FieldError } from '@/components/field-error';
import { IconColorSelect } from '@/components/icons/icon-color-select';
import { ScreenBackground } from '@/components/screen-background';
import {
  CATEGORY_ICON_PATHS,
  EXPENSE_CATEGORY_ICON_KEYS,
  getOtherCategoryIconKey,
  INCOME_CATEGORY_ICON_KEYS,
  type CategoryIconKey,
} from '@/constants/category-icons';
import { defaultCategoryIconColor } from '@/constants/icon-colors';
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import type { Category } from '@/models/category';
import type { EntryType } from '@/models/entry-type';
import {
  canDeleteLocalCategory,
  CategoryInUseError,
  createCategory,
  deleteLocalCategory,
  updateCategory,
} from '@/repositories/category-repository';
import { getCategoryName } from '@/utils/category-name';

type CategoryFormProps = {
  type: EntryType;
  category?: Category;
  onSaved: (category: Category) => void;
  onCancel: () => void;
};

export function CategoryForm({
  type,
  category,
  onSaved,
  onCancel,
}: CategoryFormProps) {
  const database = useSQLiteContext();
  const { translations, language } = useLanguage();

  const [name, setName] = useState(() => category ? getCategoryName(category, language) : '');

  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);

  const {
    errors,
    clearError,
    showFieldError,
    showFormError,
  } = useFormErrors<'name'>();

  const [iconKey, setIconKey] = useState<string>(
    category?.iconKey ?? getOtherCategoryIconKey(type),
  );

  const iconOptions: CategoryIconKey[] = type === 'INCOME'
    ? [...INCOME_CATEGORY_ICON_KEYS]
    : [...EXPENSE_CATEGORY_ICON_KEYS];

  const savedIconKey = category?.iconKey as CategoryIconKey | undefined;

  if (
    savedIconKey &&
    Object.hasOwn(CATEGORY_ICON_PATHS, savedIconKey) &&
    !iconOptions.includes(savedIconKey)
  ) {
    iconOptions.push(savedIconKey);
  }
  const [iconColor, setIconColor] = useState(
    category
      ? category.iconColor
      : defaultCategoryIconColor(null, type === 'INCOME'),
  );
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const [canDelete, setCanDelete] = useState<boolean | null>(null);

  useEffect(() => {
    if (!category) {
      return;
    }
    let active = true;
    canDeleteLocalCategory(database, category.syncId)
      .then((allowed) => {
        if (active) {
          setCanDelete(allowed);
        }
      })
      .catch((error) => console.warn('Failed to check category usage', error));
    return () => { active = false; };
  }, [database, category]);

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

    let savedCategory: Category;

    try {
      if (category && name.trim() !== getCategoryName(category, language)) {
        const approved = await new Promise<boolean>((resolve) => {
          Alert.alert(
            '',
            category.defaultKey === null
              ? translations.categoryRenameWarning
              : translations.categoryRenameLocalizedWarning,
            [
              { text: translations.cancel, style: 'cancel', onPress: () => resolve(false) },
              { text: translations.categoryRenameConfirm, onPress: () => resolve(true) },
            ],
            { cancelable: false },
          );
        });
        if (!approved) {
          return;
        }
      }
      savedCategory = category
        ? await updateCategory(database, category.syncId, {
            name,
            iconKey,
            iconColor,
            language,
          })
        : await createCategory(database, {
            name,
            type,
            iconKey,
            iconColor,
          });
    } catch (error) {
      console.warn('Failed to save category', error);

      showFormError(translations.saveCategoryError);
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    onSaved(savedCategory);
  }

  async function removeCategory() {
    if (!category || savingRef.current) {
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      await deleteLocalCategory(database, category.syncId);
    } catch (error) {
      console.warn('Failed to delete category', error);
      if (error instanceof CategoryInUseError) {
        setCanDelete(false);
        showFormError(translations.categoryInUse);
      } else {
        showFormError(translations.deleteCategoryError);
      }
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
    onCancel();
  }

  function confirmDelete() {
    if (canDelete !== true || savingRef.current) {
      return;
    }
    Alert.alert('', translations.categoryDeleteConfirmation, [
      { text: translations.cancel, style: 'cancel' },
      {
        text: translations.deleteCategory,
        style: 'destructive',
        onPress: () => void removeCategory(),
      },
    ]);
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
              {category ? translations.editCategory : translations.newCategory}
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
              maxLength={255}
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

            {category && (
              <Text style={[styles.hint, { color: palette.muted }]}>
                {category.defaultKey === null
                  ? translations.categoryCustomNameHint
                  : translations.categoryLocalNameHint}
              </Text>
            )}

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
              options={iconOptions.map((key) => ({
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
              colorSelectedOnly
              getIconBackgroundColor={() => iconColor}
            />

            <IconColorSelect
              palette="category"
              value={iconColor}
              onChange={setIconColor}
              disabled={saving}
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

              {category && (
                <>
                  <AppButton
                    title={translations.deleteCategory}
                    nativeGlass
                    variant="danger"
                    disabled={saving || canDelete !== true}
                    onPress={confirmDelete}
                  />
                  {canDelete === false && (
                    <Text style={[styles.hint, { color: palette.muted }]}>
                      {translations.categoryInUse}
                    </Text>
                  )}
                </>
              )}

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
  hint: {
    fontSize: 13,
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
});