import { useSQLiteContext } from 'expo-sqlite';
import { type ComponentRef, useEffect, useRef, useState } from 'react';
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
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSelect } from '@/components/accounts/account-select';
import { AppButton } from '@/components/app-button';
import { CategoryForm } from '@/components/categories/category-form';
import { CategoryIcon } from '@/components/categories/category-icon';
import { CompactIconSelect } from '@/components/compact-icon-select';
import { EntryDateTime } from '@/components/entries/entry-date-time';
import { FieldError } from '@/components/field-error';
import { ScreenBackground } from '@/components/screen-background';
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import type { Category } from '@/models/category';
import type { Entry } from '@/models/entry';
import type { EntryType } from '@/models/entry-type';
import {
  getAccountBySyncId,
  getAccounts,
} from '@/repositories/account-repository';
import { getCategories } from '@/repositories/category-repository';
import {
  createEntry,
  deleteEntry,
  getRecentEntryUsage,
  updateEntry,
} from '@/repositories/entry-repository';
import { parseAmountToMinor } from '@/utils/money';
import { getCategoryName } from '@/utils/category-name';
import { getCategoryPreviewIds } from '@/utils/category-preview';
import { rankByRecentUsage } from '@/utils/rank-by-recent-usage';


type EntryFormProps = {
  type: EntryType;
  entry?: Entry;
  onSaved: () => void;
  onCancel: () => void;
};

type LoadStatus = 'loading' | 'ready' | 'error';

export function EntryForm({
  type,
  entry,
  onSaved,
  onCancel,
}: EntryFormProps) {
  const database = useSQLiteContext();
  const { translations, locale, language } = useLanguage();
  const dark = useColorScheme() === 'dark';

  const [title, setTitle] = useState(entry?.title ?? '');
  const [amount, setAmount] = useState('');
  const titleRef = useRef<ComponentRef<typeof TextInput>>(null);
  const amountRef = useRef<ComponentRef<typeof TextInput>>(null);

  const {
    errors,
    clearError,
    showFieldError,
    showFormError,
  } = useFormErrors<'title' | 'amount' | 'category'>();

  const [description, setDescription] = useState(entry?.description ?? '');
  const [dateTime, setDateTime] = useState(() => {
    if (entry) {
      return new Date(entry.dateTime);
    }

    const now = new Date();
    now.setSeconds(0, 0);
    return now;
  });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryPreviewIds, setCategoryPreviewIds] = useState<string[]>([]);

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
        error: '#FF8A80',
      }
    : {
        card: '#FFFFFF',
        text: '#192238',
        muted: '#6C7890',
        border: '#E0E5EE',
        error: '#C62828',
      };

  useEffect(() => {
    let active = true;

    async function loadOptions() {
      try {
        const [
          loadedAccounts,
          loadedCategories,
          recentUsage,
          originalAccount,
        ] = await Promise.all([
          getAccounts(database),
          getCategories(database, type),
          getRecentEntryUsage(database, type),
          entry
            ? getAccountBySyncId(database, entry.accountSyncId)
            : Promise.resolve(null),
        ]);

        if (!active) {
          return;
        }

        if (entry && !originalAccount) {
          throw new Error('Original account not found');
        }

        if (
          originalAccount &&
          !loadedAccounts.some(
            (account) => account.syncId === originalAccount.syncId,
          )
        ) {
          loadedAccounts.push(originalAccount);
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

        setAccounts(rankedAccounts);
        setCategories(rankedCategories);
        setCategoryPreviewIds(getCategoryPreviewIds(
          rankedCategories,
          recentUsage[0]?.categorySyncId,
        ));

        setAccountSyncId(
          entry?.accountSyncId ?? rankedAccounts[0]?.syncId ?? null,
        );

        if (entry && originalAccount) {
          const digits = new Intl.NumberFormat('en', {
            style: 'currency',
            currency: originalAccount.currencyCode,
          }).resolvedOptions().maximumFractionDigits ?? 2;

          const raw = String(entry.amountMinor).padStart(digits + 1, '0');
          setAmount(
            digits === 0
              ? raw
              : `${raw.slice(0, -digits)}.${raw.slice(-digits)}`,
          );
        }

        setCategorySyncId(
          entry?.categorySyncId ?? rankedCategories[0]?.syncId ?? null,
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
  }, [database, type, entry]);

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
    clearError('category');
  }

  async function saveEntry() {
    if (savingRef.current) {
      return;
    }

    if (title.trim().length === 0) {
      showFieldError(
        'title',
        translations.entryTitleRequired,
        titleRef,
      );
      return;
    }

    if (!selectedAccount) {
      showFormError(translations.entryOptionsRequired);
      return;
    }

    if (!categorySyncId) {
      showFieldError(
        'category',
        translations.entryCategoryRequired,
      );
      return;
    }

    const fractionDigits = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: selectedAccount.currencyCode,
    }).resolvedOptions().maximumFractionDigits ?? 2;

    const normalizedAmount = amount.trim().replace(',', '.');

    const hasNonZeroFraction =
      /^-?\d+\.\d+$/.test(normalizedAmount) &&
      /[1-9]/.test(normalizedAmount.split('.')[1]);

    if (fractionDigits === 0 && hasNonZeroFraction) {
      showFieldError(
        'amount',
        translations.currencyWholeAmountRequired,
        amountRef,
      );
      return;
    }

    const amountToParse = fractionDigits === 0
      ? normalizedAmount.replace(/\.0+$/, '')
      : normalizedAmount;

    const amountMinor = parseAmountToMinor(
      amountToParse,
      fractionDigits,
    );

    if (amountMinor === null || amountMinor <= 0) {
      showFieldError(
        'amount',
        translations.entryAmountInvalid,
        amountRef,
      );
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      const input = {
        title,
        type,
        amountMinor,
        dateTime,
        description,
        accountSyncId: selectedAccount.syncId,
        categorySyncId,
      };

      if (entry) {
        await updateEntry(database, entry.syncId, input);
      } else {
        await createEntry(database, input);
      }
    } catch (error) {
      console.warn('Failed to save entry', error);

      showFormError(translations.saveEntryError);
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    onSaved();
  }

  async function removeEntry() {
    if (!entry || savingRef.current) {
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      await deleteEntry(database, entry.syncId);
    } catch (error) {
      console.warn('Failed to delete entry', error);
      showFormError(translations.deleteEntryError);
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    onSaved();
  }

  function confirmDeleteEntry() {
    if (!entry || savingRef.current) {
      return;
    }

    Alert.alert('', translations.deleteEntryConfirmation(entry.title), [
      { text: translations.cancel, style: 'cancel' },
      {
        text: translations.deleteEntry,
        style: 'destructive',
        onPress: () => void removeEntry(),
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
            <Text style={[styles.title, { color: palette.text }]}>
              {entry
                ? type === 'EXPENSE'
                  ? translations.editExpense
                  : translations.editIncome
                : type === 'EXPENSE'
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
                  maxLength={255}
                  editable={!saving}
                  ref={titleRef}
                  onChangeText={(text) => {
                    setTitle(text);
                    clearError('title');
                  }}
                  style={[
                    inputStyle,
                    errors.title && {
                      borderColor: palette.error,
                    },
                  ]}
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                />

                <FieldError message={errors.title} />

                <Text style={[styles.label, { color: palette.text }]}>
                  {translations.entryAccount}
                </Text>

                <AccountSelect
                  accounts={accounts}
                  value={accountSyncId}
                  onChange={(syncId) => {
                    setAccountSyncId(syncId);
                    clearError('amount');
                  }}
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
                  keyboardType="decimal-pad"
                  editable={!saving}
                  ref={amountRef}
                  onChangeText={(text) => {
                    setAmount(text);
                    clearError('amount');
                  }}
                  style={[
                    inputStyle,
                    errors.amount && {
                      borderColor: palette.error,
                    },
                  ]}
                />

                <FieldError message={errors.amount} />

                <Text style={[styles.label, { color: palette.text }]}>
                  {translations.entryCategory}
                </Text>

                <CompactIconSelect
                  title={translations.entryCategory}
                  options={categories.map((category) => ({
                    value: category.syncId,
                    label: getCategoryName(category, language),
                  }))}
                  previewValues={categoryPreviewIds}
                  value={categorySyncId}
                  onChange={(syncId) => {
                    setCategorySyncId(syncId);
                    clearError('category');
                  }}
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

                <FieldError message={errors.category} />

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

              {entry && status === 'ready' && (
                <AppButton
                  title={translations.deleteEntry}
                  variant="danger"
                  nativeGlass
                  disabled={saving}
                  onPress={confirmDeleteEntry}
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