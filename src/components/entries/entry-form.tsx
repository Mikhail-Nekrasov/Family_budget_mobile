import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
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

import { AccountSelect } from '@/components/accounts/account-select';
import { AppButton } from '@/components/app-button';
import { CategoryForm } from '@/components/categories/category-form';
import { CategoryIcon } from '@/components/categories/category-icon';
import { CompactIconSelect } from '@/components/compact-icon-select';
import { EntryDateTime } from '@/components/entries/entry-date-time';
import { ScreenBackground } from '@/components/screen-background';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import type { Category } from '@/models/category';
import type { EntryType } from '@/models/entry-type';
import { getAccounts } from '@/repositories/account-repository';
import { getCategories } from '@/repositories/category-repository';
import {
  createEntry,
  getRecentEntryUsage,
} from '@/repositories/entry-repository';
import { parseAmountToMinor } from '@/utils/money';
import { rankByRecentUsage } from '@/utils/rank-by-recent-usage';


type EntryFormProps = {
  type: EntryType;
  onSaved: () => void;
  onCancel: () => void;
};

type LoadStatus = 'loading' | 'ready' | 'error';

export function EntryForm({
  type,
  onSaved,
  onCancel,
}: EntryFormProps) {
  const database = useSQLiteContext();
  const { translations, locale } = useLanguage();
  const dark = useColorScheme() === 'dark';

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [accountSyncId, setAccountSyncId] = useState<string | null>(
    null,
  );
  const [categorySyncId, setCategorySyncId] = useState<string | null>(
    null,
  );

  const [status, setStatus] = useState<LoadStatus>('loading');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

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

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [
          loadedAccounts,
          loadedCategories,
          recentUsage,
        ] = await Promise.all([
          getAccounts(database),
          getCategories(database, type),
          getRecentEntryUsage(database, type),
        ]);

        if (!active) {
          return;
        }

        const rankedAccounts = rankByRecentUsage(
          loadedAccounts,
          recentUsage.map((entry) => entry.accountSyncId),
          (account) => account.syncId,
        );

        const rankedCategories = rankByRecentUsage(
          loadedCategories,
          recentUsage.map((entry) => entry.categorySyncId),
          (category) => category.syncId,
        );

        const usedCategoryIds = new Set(
          recentUsage.map((entry) => entry.categorySyncId),
        );

        const recommendedCategoryIds = rankedCategories
          .filter((category) => usedCategoryIds.has(category.syncId))
          .slice(0, 3)
          .map((category) => category.syncId);

        setAccounts(rankedAccounts);
        setCategories(rankedCategories);

        setAccountSyncId(rankedAccounts[0]?.syncId ?? null);

        setCategorySyncId(
          recommendedCategoryIds[0] ?? null,
        );

        setStatus('ready');
      } catch (error) {
        console.warn('Failed to load entry options', error);

        if (active) {
          setStatus('error');
        }
      }
    }

    void loadOptions();

    return () => {
      active = false;
    };
  }, [database, type]);

  const selectedAccount = accounts.find(
    (account) => account.syncId === accountSyncId,
  );

  const optionsAvailable =
    status === 'ready' &&
    accounts.length > 0 &&
    categories.length > 0;

  const inputStyle = [
    styles.input,
    {
      color: palette.text,
      backgroundColor: palette.card,
      borderColor: palette.border,
    },
  ];

  function acceptCreatedCategory(category: Category) {
    setCategories((current) => {
      const withoutDuplicate = current.filter(
        (item) => item.syncId !== category.syncId,
      );

      return [...withoutDuplicate, category];
    });

    setCategorySyncId(category.syncId);
  }

  async function saveEntry() {
    if (savingRef.current) {
      return;
    }

    if (
      title.trim().length === 0 ||
      title.trim().length > 255
    ) {
      Alert.alert(
        translations.error,
        translations.entryTitleRequired,
      );
      return;
    }

    if (!selectedAccount) {
      Alert.alert(
        translations.error,
        translations.entryOptionsRequired,
      );
      return;
    }

    if (!categorySyncId) {
      Alert.alert(
        translations.error,
        translations.entryCategoryRequired,
      );
      return;
    }

    const fractionDigits = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: selectedAccount.currencyCode,
    }).resolvedOptions().maximumFractionDigits ?? 2;

    const amountMinor = parseAmountToMinor(
      amount,
      fractionDigits,
    );

    if (amountMinor === null || amountMinor <= 0) {
      Alert.alert(
        translations.error,
        translations.entryAmountInvalid,
      );
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      await createEntry(database, {
        title,
        type,
        amountMinor,
        dateTime,
        description,
        accountSyncId: selectedAccount.syncId,
        categorySyncId,
      });
    } catch (error) {
      console.warn('Failed to save entry', error);

      Alert.alert(
        translations.error,
        translations.saveEntryError,
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
            keyboardDismissMode="on-drag"
          >
            <Text style={[styles.title, { color: palette.text }]}>
              {type === 'EXPENSE'
                ? translations.newExpense
                : translations.newIncome}
            </Text>

            {status === 'loading' ? (
              <ActivityIndicator
                color={palette.text}
                accessibilityLabel={translations.loading}
              />
            ) : status === 'error' ? (
              <Text style={{ color: palette.muted }}>
                {translations.entryOptionsError}
              </Text>
            ) : !optionsAvailable ? (
              <Text style={{ color: palette.muted }}>
                {translations.entryOptionsRequired}
              </Text>
            ) : (
              <>
                <Text style={[styles.label, { color: palette.text }]}>
                  {translations.entryTitle}
                </Text>

                <TextInput
                  accessibilityLabel={translations.entryTitle}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={255}
                  editable={!saving}
                  style={inputStyle}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  {translations.entryAccount}
                </Text>

                <AccountSelect
                  accounts={accounts}
                  value={accountSyncId}
                  onChange={setAccountSyncId}
                  disabled={saving}
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  {translations.entryAmount}
                  {' · '}
                  {selectedAccount?.currencyCode}
                </Text>

                <TextInput
                  accessibilityLabel={translations.entryAmount}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  editable={!saving}
                  style={inputStyle}
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  {translations.entryCategory}
                </Text>

                <CompactIconSelect
                  title={translations.entryCategory}
                  options={categories.map((category) => ({
                    value: category.syncId,
                    label: category.name,
                  }))}
                  value={categorySyncId}
                  onChange={setCategorySyncId}
                  disabled={saving}
                  showLabels
                  renderCreateForm={(onCreated, onCancel) => (
                    <CategoryForm
                      type={type}
                      onSaved={(category) => {
                        acceptCreatedCategory(category);
                        onCreated(category.syncId);
                      }}
                      onCancel={onCancel}
                    />
                  )}
                  renderIcon={(syncId, color, size) => {
                    const category = categories.find(
                      (item) => item.syncId === syncId,
                    );

                    return (
                      <CategoryIcon
                        iconKey={category?.iconKey ?? 'category'}
                        color={color}
                        size={size}
                      />
                    );
                  }}
                />

                <EntryDateTime
                  value={dateTime}
                  onChange={setDateTime}
                  disabled={saving}
                />

                <Text style={[styles.label, { color: palette.text }]}>
                  {translations.description}
                </Text>

                <TextInput
                  accessibilityLabel={translations.description}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  scrollEnabled={false}
                  editable={!saving}
                  style={[
                    inputStyle,
                    styles.description,
                  ]}
                />
              </>
            )}

            <View style={styles.actions}>
              {optionsAvailable && (
                <AppButton
                  title={translations.save}
                  nativeGlass
                  loading={saving}
                  onPress={() => void saveEntry()}
                />
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  actions: {
    gap: 8,
    marginTop: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
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
  description: {
    minHeight: 48,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
});