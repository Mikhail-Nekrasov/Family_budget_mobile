import { useSQLiteContext } from 'expo-sqlite';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountIcon } from '@/components/accounts/account-icon';
import { AppButton } from '@/components/app-button';
import { FieldError } from '@/components/field-error';
import { ScreenBackground } from '@/components/screen-background';
import { CURRENCY_CODES } from '@/constants/currencies';
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import {
  archiveAccount,
  canDeleteLocalAccount,
  createAccount,
  deleteLocalAccount,
  restoreAccount,
  updateAccount
} from '@/repositories/account-repository';
import { parseAmountToMinor } from '@/utils/money';


type Props = {
  account?: Account;
  onSaved: () => void;
  onCancel: () => void;
};

export function AccountForm({ account, onSaved, onCancel }: Props) {
  const database = useSQLiteContext();
  const { translations } = useLanguage();

  const [name, setName] = useState(account?.name ?? '');

  const [currencyCode, setCurrencyCode] = useState(
    account?.currencyCode ?? 'EUR',
  );

  const [currencyExpanded, setCurrencyExpanded] = useState(false);

  const nameRef = useRef<ComponentRef<typeof TextInput>>(null);

  const openingBalanceRef =
    useRef<ComponentRef<typeof TextInput>>(null);

  const {
    errors,
    clearError,
    showFieldError,
    showFormError,
  } = useFormErrors<'name' | 'openingBalance'>();

  const [description, setDescription] = useState(
    account?.description ?? '',
  );
  const [openingBalance, setOpeningBalance] = useState('0');
  const [iconKey, setIconKey] = useState(
    account?.iconKey ?? 'cash',
  );
  const [saving, setSaving] = useState(false);

  const savingRef = useRef(false);
  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        background: '#111722',
        card: '#1C2432',
        text: '#F0F3FA',
        border: '#333F52',
        accent: '#A0B8FF',
        error: '#FF8A80',
      }
    : {
        background: '#F5F6F9',
        card: '#FFFFFF',
        text: '#192238',
        border: '#E0E5EE',
        accent: '#365BBC',
        error: '#C62828',
      };

  const inputStyle = [
    styles.input,
    {
      color: palette.text,
      backgroundColor: palette.card,
      borderColor: palette.border,
    },
  ];

  const iconOptions = [
    { key: 'cash', label: translations.cashIcon },
    { key: 'card', label: translations.cardIcon },
  ] as const;

  const [canDelete, setCanDelete] = useState(false);
  const accountSyncId = account?.syncId;

  useEffect(() => {
    let active = true;

    async function checkDeletion() {
      if (!accountSyncId) {
        return;
      }

      try {
        const allowed = await canDeleteLocalAccount(
          database,
          accountSyncId,
        );

        if (active) {
          setCanDelete(allowed);
        }
      } catch (error) {
        console.warn('Failed to check account deletion', error);

        if (active) {
          setCanDelete(false);
        }
      }
    }

    void checkDeletion();

    return () => {
      active = false;
    };
  }, [database, accountSyncId]);

  async function saveAccount() {
    if (savingRef.current) {
      return;
    }

    if (name.trim().length === 0) {
      showFieldError(
        'name',
        translations.accountNameRequired,
        nameRef,
      );
      return;
    }

    const fractionDigits = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
    }).resolvedOptions().maximumFractionDigits ?? 2;

    const openingBalanceMinor = account
      ? account.openingBalanceMinor
      : parseAmountToMinor(openingBalance, fractionDigits);

    if (openingBalanceMinor === null) {
      showFieldError(
        'openingBalance',
        translations.invalidAmount,
        openingBalanceRef,
      );
      return;
    }

    savingRef.current = true;
    setSaving(true);

    try {
      if (account) {
        await updateAccount(database, account.syncId, {
          name,
          description,
          iconKey,
        });
      } else {
        await createAccount(database, {
          name,
          description,
          currencyCode,
          iconKey,
          openingBalanceMinor,
        });
      }
    } catch (error) {
      console.warn('Failed to save account', error);

      showFormError(translations.saveAccountError);
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    onSaved();
  }

  async function changeAccount(
    action: 'archive' | 'restore' | 'delete',
  ) {
    if (!account || savingRef.current) {
      return;
    }

    const actions = {
      archive: archiveAccount,
      restore: restoreAccount,
      delete: deleteLocalAccount,
    };

    savingRef.current = true;
    setSaving(true);

    try {
      await actions[action](database, account.syncId);
    } catch (error) {
      console.warn('Failed to change account', error);

      Alert.alert(
        translations.error,
        translations.accountActionError,
      );
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    onSaved();
  }

  function confirmDeleteAccount() {
    if (!account || !canDelete || savingRef.current) {
      return;
    }

    Alert.alert(
      translations.deleteAccount,
      translations.deleteAccountConfirmation(account.name),
      [
        {
          text: translations.cancel,
          style: 'cancel',
        },
        {
          text: translations.deleteAccount,
          style: 'destructive',
          onPress: () => void changeAccount('delete'),
        },
      ],
    );
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
              {account
                ? translations.editAccount
                : translations.newAccount}
            </Text>

            <Text style={[styles.label, { color: palette.text }]}>
              {translations.accountName}
            </Text>

            <TextInput
              ref={nameRef}
              accessibilityLabel={translations.accountName}
              value={name}
              onChangeText={(text) => {
                setName(text);
                clearError('name');
              }}
              editable={!saving}
              returnKeyType="done"
              submitBehavior="blurAndSubmit"
              style={[
                inputStyle,
                errors.name && {
                  borderColor: palette.error,
                },
              ]}
            />

            <FieldError message={errors.name} />

            <Text style={[styles.label, { color: palette.text }]}>
              {translations.description}
            </Text>

            <TextInput
              accessibilityLabel={translations.description}
              value={description}
              onChangeText={setDescription}
              editable={!saving}
              multiline
              textAlignVertical="top"
              style={[inputStyle, styles.description]}
            />

            {!account && (
              <>
                <Text style={[styles.label, { color: palette.text }]}>
                  {translations.openingBalance}
                </Text>

                <TextInput
                  ref={openingBalanceRef}
                  accessibilityLabel={translations.openingBalance}
                  value={openingBalance}
                  onChangeText={(text) => {
                    setOpeningBalance(text);
                    clearError('openingBalance');
                  }}
                  editable={!saving}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                  style={[
                    inputStyle,
                    errors.openingBalance && {
                      borderColor: palette.error,
                    },
                  ]}
                />

                <FieldError message={errors.openingBalance} />
              </>
            )}

            <Text style={[styles.label, { color: palette.text }]}>
              {translations.currency}
            </Text>

            {account ? (
              <Text
                style={[
                  styles.currency,
                  { color: palette.text },
                ]}
              >
                {currencyCode}
              </Text>
            ) : (
              <View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={
                    `${translations.currency}: ${currencyCode}`
                  }
                  accessibilityState={{
                    expanded: currencyExpanded,
                    disabled: saving,
                  }}
                  disabled={saving}
                  onPress={() => {
                    Keyboard.dismiss();
                    setCurrencyExpanded((current) => !current);
                  }}
                  style={[
                    styles.currencyField,
                    {
                      backgroundColor: palette.card,
                      borderColor: palette.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.currencyCode,
                      { color: palette.text },
                    ]}
                  >
                    {currencyCode}
                  </Text>

                  <Text
                    accessible={false}
                    style={{ color: palette.accent }}
                  >
                    {currencyExpanded ? '▴' : '▾'}
                  </Text>
                </Pressable>

                {currencyExpanded && (
                  <ScrollView
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    style={[
                      styles.currencyList,
                      {
                        backgroundColor: palette.card,
                        borderColor: palette.border,
                      },
                    ]}
                  >
                    {CURRENCY_CODES.map((code) => (
                      <Pressable
                        key={code}
                        accessibilityRole="radio"
                        accessibilityLabel={code}
                        accessibilityState={{
                          checked: currencyCode === code,
                          disabled: saving,
                        }}
                        disabled={saving}
                        onPress={() => {
                          setCurrencyCode(code);
                          setCurrencyExpanded(false);
                          clearError('openingBalance');
                        }}
                        style={styles.currencyOption}
                      >
                        <Text
                          style={[
                            styles.currencyCode,
                            {
                              color: currencyCode === code
                                ? palette.accent
                                : palette.text,
                            },
                          ]}
                        >
                          {code}
                        </Text>

                        <Text style={{ color: palette.accent }}>
                          {currencyCode === code ? '✓' : ''}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            <Text style={[styles.label, { color: palette.text }]}>
              {translations.accountIcon}
            </Text>

            <View style={styles.iconOptions}>
              {iconOptions.map((option) => (
                <Pressable
                  key={option.key}
                  accessibilityRole="radio"
                  accessibilityState={{
                    checked: iconKey === option.key,
                  }}
                  accessibilityLabel={option.label}
                  disabled={saving}
                  onPress={() => setIconKey(option.key)}
                  style={[
                    styles.iconOption,
                    {
                      backgroundColor: palette.card,
                      borderColor: iconKey === option.key
                        ? palette.accent
                        : palette.border,
                    },
                  ]}
                >
                  <AccountIcon
                    iconKey={option.key}
                    color={palette.text}
                  />
                </Pressable>
              ))}
            </View>

            <View style={styles.actions}>
              <AppButton
                title={
                  saving
                    ? translations.saving
                    : translations.save
                }
                nativeGlass
                disabled={saving}
                onPress={() => void saveAccount()}
              />

              {account && (
                <>
                  <AppButton
                    title={
                      account.archivedAt === null
                        ? translations.archiveAccount
                        : translations.restoreAccount
                    }
                    nativeGlass
                    disabled={saving}
                    onPress={() =>
                      void changeAccount(
                        account.archivedAt === null
                          ? 'archive'
                          : 'restore',
                      )
                    }
                  />

                  {canDelete && (
                    <AppButton
                      title={translations.deleteAccount}
                      variant="danger"
                      nativeGlass
                      disabled={saving}
                      onPress={confirmDeleteAccount}
                    />
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
    marginBottom: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    minHeight: 48,
  },
  description: {
    minHeight: 96,
  },
  currency: {
    fontSize: 16,
    paddingVertical: 8,
  },
  iconOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderWidth: 2,
    borderRadius: 12,
    gap: 6,
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
  currencyField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderRadius: 12,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '600',
  },
  currencyList: {
    maxHeight: 220,
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
  },
  currencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 14,
  },
});