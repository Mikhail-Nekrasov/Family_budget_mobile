import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState, type ComponentRef } from 'react';
import {
  Alert,
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
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import {
  archiveAccount,
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

    const openingBalanceMinor = account
      ? account.openingBalanceMinor
      : parseAmountToMinor(openingBalance, 2);

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
          currencyCode: 'EUR',
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
    if (!account || savingRef.current) {
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

            <Text style={[styles.currency, { color: palette.text }]}>
              {account?.currencyCode ?? 'EUR'}
            </Text>

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

                  {account.serverId === null && (
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
});