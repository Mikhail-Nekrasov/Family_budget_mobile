import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import {
  Alert,
  Button,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import { createAccount, updateAccount } from '@/repositories/account-repository';
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
      }
    : {
        background: '#F5F6F9',
        card: '#FFFFFF',
        text: '#192238',
        border: '#E0E5EE',
        accent: '#365BBC',
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
      Alert.alert(
        translations.error,
        translations.accountNameRequired,
      );
      return;
    }

    const openingBalanceMinor = account
      ? account.openingBalanceMinor
      : parseAmountToMinor(openingBalance, 2);

    if (openingBalanceMinor === null) {
      Alert.alert(
        translations.error,
        translations.invalidAmount,
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

      Alert.alert(
        translations.error,
        translations.saveAccountError,
      );
      return;
    } finally {
      savingRef.current = false;
      setSaving(false);
    }

    onSaved();
  }

  return (
    <SafeAreaView
      style={[
        styles.screen,
        { backgroundColor: palette.background },
      ]}
    >
      <KeyboardAvoidingView
        style={styles.screen}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
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
            accessibilityLabel={translations.accountName}
            value={name}
            onChangeText={setName}
            editable={!saving}
            style={inputStyle}
          />

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
                accessibilityLabel={translations.openingBalance}
                value={openingBalance}
                onChangeText={setOpeningBalance}
                editable={!saving}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                style={inputStyle}
              />
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
                <Text style={{ color: palette.text }}>
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Button
              title={
                saving
                  ? translations.saving
                  : translations.save
              }
              disabled={saving}
              onPress={() => void saveAccount()}
            />

            <Button
              title={translations.cancel}
              disabled={saving}
              onPress={onCancel}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  },
  actions: {
    gap: 12,
    marginTop: 16,
  },
});