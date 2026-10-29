import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { ScreenBackground } from '@/components/screen-background';
import { useLanguage } from '@/hooks/use-language';
import type { EntryType } from '@/models/entry-type';
import { createCategory } from '@/repositories/category-repository';

type CategoryFormProps = {
  type: EntryType;
  onSaved: () => void;
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
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        card: '#1C2432',
        text: '#F0F3FA',
        muted: '#A8B3C5',
        border: '#333F52',
      }
    : {
        card: '#FFFFFF',
        text: '#192238',
        muted: '#6C7890',
        border: '#E0E5EE',
      };

  async function saveCategory() {
    if (savingRef.current) {
      return;
    }

    if (name.trim().length === 0) {
      Alert.alert(
        translations.error,
        translations.categoryNameRequired,
      );
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      await createCategory(database, {
        name,
        type,
      });
    } catch (error) {
      console.warn('Failed to save category', error);

      Alert.alert(
        translations.error,
        translations.saveCategoryError,
      );
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    onSaved();
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
              accessibilityLabel={translations.categoryName}
              value={name}
              onChangeText={setName}
              editable={!saving}
              style={[
                styles.input,
                {
                  color: palette.text,
                  backgroundColor: palette.card,
                  borderColor: palette.border,
                },
              ]}
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