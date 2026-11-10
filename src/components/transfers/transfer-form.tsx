import { useSQLiteContext } from 'expo-sqlite';
import { useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountSelect } from '@/components/accounts/account-select';
import { AppButton } from '@/components/app-button';
import { EntryDateTime } from '@/components/entries/entry-date-time';
import { FieldError } from '@/components/field-error';
import { ScreenBackground } from '@/components/screen-background';
import { useDismissOnOutsideTap } from '@/hooks/use-dismiss-on-outside-tap';
import { useFormErrors } from '@/hooks/use-form-errors';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import type { TransferHistoryItem } from '@/models/transfer';
import { createTransfer, deleteTransfer, updateTransfer } from '@/repositories/transfer-repository';
import { convertAmountAtRate } from '@/services/currency-conversion-service';
import { buildRateListRows, readRateList } from '@/services/exchange-rate-list-service';
import { isEntryDateAllowed, MIN_PERIOD_YEAR } from '@/utils/entry-period';
import { playCompletionFeedback } from '@/utils/haptic-feedback';
import { currencyFractionDigits, parseAmountToMinor, rateFromAmounts } from '@/utils/money';

export type TransferSelection = { fromId: string | null; toId: string | null };

type Props = {
  accounts: readonly Account[];
  initialSelection: TransferSelection;
  transfer?: TransferHistoryItem;
  onSavingChange: (saving: boolean) => void;
  onSaved: () => void | Promise<void>;
  onCancel: () => void;
};

function parseTransferAmount(value: string, currency: string) {
  const amount = parseAmountToMinor(value, currencyFractionDigits(currency));
  return amount !== null && amount > 0 ? amount : null;
}

function parseRate(value: string): number | null {
  const normalized = value.trim().replace(',', '.');
  if (!/^([0-9]+(\.[0-9]*)?|\.[0-9]+)$/.test(normalized)) return null;
  const rate = Number(normalized);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

function formatRate(value: number): string {
  // Keep the editable value as plain decimal text, even for very small rates.
  return new Intl.NumberFormat('en', {
    useGrouping: false,
    maximumSignificantDigits: 12,
  }).format(value);
}

function formatMinorForInput(value: number, currency: string): string {
  const digits = currencyFractionDigits(currency);
  const text = String(value).padStart(digits + 1, '0');
  return digits === 0 ? text : `${text.slice(0, -digits)}.${text.slice(-digits)}`;
}

export function TransferForm({ accounts, initialSelection, transfer, onSavingChange, onSaved, onCancel }: Props) {
  const database = useSQLiteContext();
  const { translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const [selection, setSelection] = useState(initialSelection);
  const [expanded, setExpanded] = useState<keyof TransferSelection | null>(null);
  const [amount, setAmount] = useState(() => transfer
    ? formatMinorForInput(transfer.amountMinor, transfer.sourceCurrencyCode)
    : '');
  const [quote, setQuote] = useState<{ field: 'target' | 'rate'; value: string }>(() => ({
    field: 'target',
    value: transfer ? formatMinorForInput(transfer.targetAmountMinor, transfer.targetCurrencyCode) : '',
  }));
  const [loadingRate, setLoadingRate] = useState(false);
  const rateRequest = useRef(0);
  const fetchingRate = useRef(false);
  const [description, setDescription] = useState(transfer?.description ?? '');
  const [dateTime, setDateTime] = useState(() => transfer ? new Date(transfer.dateTime) : new Date());
  const [pendingAction, setPendingAction] = useState<'save' | 'delete' | null>(null);
  const saving = pendingAction !== null;
  const savingRef = useRef(false);
  const { errors, showFieldError, clearError, showFormError } =
    useFormErrors<'accounts' | 'amount' | 'targetAmount' | 'rate'>();
  const { outsideTapHandlers, markInsideTouch } =
    useDismissOnOutsideTap(expanded !== null, () => setExpanded(null));

  const from = accounts.find((account) => account.syncId === selection.fromId);
  const to = accounts.find((account) => account.syncId === selection.toId);
  const crossCurrency = Boolean(from && to && from.currencyCode !== to.currencyCode);
  const amountMinor = from ? parseTransferAmount(amount, from.currencyCode) : null;
  const quotedRate = quote.field === 'rate' ? parseRate(quote.value) : null;
  const convertedAmount = from && to && crossCurrency && amountMinor !== null && quotedRate !== null
    ? convertAmountAtRate(amountMinor, from.currencyCode, to.currencyCode, quotedRate)
    : null;

  const targetAmount = quote.field === 'target'
    ? quote.value
    : convertedAmount !== null && to ? formatMinorForInput(convertedAmount, to.currencyCode) : '';
  const targetAmountMinor = crossCurrency && to
    ? parseTransferAmount(targetAmount, to.currencyCode)
    : null;
  const rate = quote.field === 'rate' ? quote.value
    : from && to && amountMinor !== null && targetAmountMinor !== null
      ? formatRate(
        rateFromAmounts(amountMinor, from.currencyCode, targetAmountMinor, to.currencyCode),
      )
      : '';


  const palette = dark
    ? { card: '#1C2432', text: '#F0F3FA', border: '#333F52' }
    : { card: '#FFFFFF', text: '#192238', border: '#E0E5EE' };
  const inputStyle = [styles.input, {
    backgroundColor: palette.card, color: palette.text, borderColor: palette.border,
  }];

  function changeQuote(field: 'target' | 'rate', value: string) {
    rateRequest.current += 1;
    setQuote({ field, value });
    clearError('rate');
    clearError('targetAmount');
  }

  async function applyCurrentRate() {
    if (!from || !to || !crossCurrency || savingRef.current || fetchingRate.current) return;
    Keyboard.dismiss();
    setExpanded(null);
    fetchingRate.current = true;
    setLoadingRate(true);
    const request = ++rateRequest.current;

    try {
      const data = await readRateList(database, null);
      const currentRate = buildRateListRows(data, from.currencyCode)
        .find((row) => row.currencyCode === to.currencyCode)?.rate;
      if (request !== rateRequest.current) return;

      if (currentRate == null) {
        showFieldError('rate', translations.ratesUnavailable);
        return;
      }
      changeQuote('rate', formatRate(currentRate));
    } catch {
      if (request === rateRequest.current) {
        showFieldError('rate', translations.ratesUnavailable);
      }
    } finally {
      fetchingRate.current = false;
      setLoadingRate(false);
    }
  }

  async function save() {
    if (savingRef.current || fetchingRate.current) return;
    if (!from || !to || from.syncId === to.syncId) {
      showFieldError('accounts', translations.transferAccountsRequired);
      return;
    }

    if (amountMinor === null) {
      showFieldError('amount', translations.invalidAmount);
      return;
    }

    if (crossCurrency && targetAmountMinor === null) {
      showFieldError('targetAmount', translations.invalidAmount);
      return;
    }

    if (!isEntryDateAllowed(dateTime)) {
      showFormError(translations.entryDateInvalid(MIN_PERIOD_YEAR));
      return;
    }

    const input = {
      fromAccountSyncId: from.syncId,
      toAccountSyncId: to.syncId,
      amountMinor, targetAmountMinor, dateTime, description,
    };

    await mutate('save', () => transfer
      ? updateTransfer(database, transfer.syncId, input)
      : createTransfer(database, input));
  }

  async function mutate(action: 'save' | 'delete', run: () => Promise<void>) {
    if (savingRef.current || fetchingRate.current) return;

    savingRef.current = true;
    onSavingChange(true);
    setExpanded(null);
    setPendingAction(action);

    try {
      try {
        await run();
      } catch (error) {
        console.warn('Failed to change transfer', error);
        showFormError(action === 'delete' ? translations.deleteTransferError : translations.saveTransferError);
        return;
      }

      playCompletionFeedback();
      await onSaved();
    } finally {
      savingRef.current = false;
      onSavingChange(false);
      setPendingAction(null);
    }
  }

  function confirmDelete() {
    if (!transfer || savingRef.current || fetchingRate.current) return;

    Keyboard.dismiss();
    setExpanded(null);
    Alert.alert('', translations.deleteTransferConfirmation, [
      { text: translations.cancel, style: 'cancel' },
      {
        text: translations.deleteTransfer,
        style: 'destructive',
        onPress: () => void mutate('delete', () => deleteTransfer(database, transfer.syncId)),
      },
    ]);
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.screen} {...outsideTapHandlers}>
        <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
            <Text accessibilityRole="header" style={[styles.title, { color: palette.text }]}>
              {transfer ? translations.editTransfer : translations.newTransfer}
            </Text>

            {(['fromId', 'toId'] as const).map((field) => {
              const isSource = field === 'fromId';
              const label = isSource ? translations.transferFrom : translations.transferTo;
              const excludedId = isSource ? selection.toId : selection.fromId;
              const originalId = isSource ? transfer?.fromAccountSyncId : transfer?.toAccountSyncId;

              return (
                <View key={field} style={styles.field}>
                  <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
                  <AccountSelect
                    label={label}
                    accounts={accounts.filter((account) => account.syncId !== excludedId &&
                      (account.archivedAt === null || account.syncId === originalId))}
                    value={selection[field]}
                    expanded={expanded === field}
                    onExpandedChange={(open) => setExpanded(open ? field : null)}
                    onTouchInside={markInsideTouch}
                    onChange={(id) => {
                      if (id === selection[field]) return;
                      const next = accounts.find((account) => account.syncId === id);
                      if (isSource && from && next?.currencyCode !== from.currencyCode) setAmount('');
                      const oldCurrency = isSource ? from?.currencyCode : to?.currencyCode;
                      if (next?.currencyCode !== oldCurrency) changeQuote('target', '');
                      setSelection((current) => ({ ...current, [field]: id }));
                      clearError('accounts');
                      clearError('amount');
                      clearError('targetAmount');
                    }}
                    disabled={saving}
                  />
                </View>
              );
            })}
            <FieldError message={errors.accounts} />

            <View style={styles.field}>
              <Text style={[styles.label, { color: palette.text }]}>
                {crossCurrency ? translations.transferDebit : translations.entryAmount}
                {from ? ` · ${from.currencyCode}` : ''}
              </Text>
              <TextInput
                accessibilityLabel={crossCurrency ? translations.transferDebit : translations.entryAmount}
                value={amount}
                onChangeText={(value) => { setAmount(value); clearError('amount'); }}
                keyboardType="decimal-pad"
                editable={!saving}
                style={inputStyle}
              />
              <FieldError message={errors.amount} />
            </View>

            {crossCurrency && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: palette.text }]}>
                  {translations.transferCredit} · {to?.currencyCode}
                </Text>
                <TextInput
                  accessibilityLabel={translations.transferCredit}
                  value={targetAmount}
                  onChangeText={(value) => changeQuote('target', value)}
                  keyboardType="decimal-pad"
                  editable={!saving}
                  style={inputStyle}
                />
                <FieldError message={errors.targetAmount} />
                <Text style={[styles.or, { color: palette.text }]}>{translations.transferOr}</Text>
                <Text style={[styles.label, styles.rateLabel, { color: palette.text }]}>
                  {translations.transferRate}
                </Text>
                <View style={styles.rateRow}>
                  <TextInput
                    accessibilityLabel={translations.transferRate}
                    value={rate}
                    onChangeText={(value) => changeQuote('rate', value)}
                    keyboardType="decimal-pad"
                    editable={!saving}
                    style={[inputStyle, styles.rateField]}
                  />
                  <View style={styles.rateButton}>
                    <AppButton
                      title={translations.transferCurrentRate}
                      nativeGlass
                      compact
                      disabled={saving}
                      loading={loadingRate}
                      onPress={() => void applyCurrentRate()}
                    />
                  </View>
                </View>
                <FieldError message={errors.rate} />
              </View>
            )}

            <EntryDateTime value={dateTime} onChange={setDateTime} disabled={saving} />

            <View style={styles.field}>
              <Text style={[styles.label, { color: palette.text }]}>{translations.description}</Text>
              <TextInput
                accessibilityLabel={translations.description}
                value={description}
                onChangeText={setDescription}
                editable={!saving}
                multiline
                style={[inputStyle, styles.description]}
              />
            </View>

            <View style={styles.actions}>
              <AppButton
                title={pendingAction === 'save' ? translations.saving : translations.save}
                nativeGlass
                rightIcon="check"
                keepTitleCentered
                disabled={loadingRate || pendingAction === 'delete'}
                loading={pendingAction === 'save'}
                onPress={() => void save()}
              />
              {transfer && (
                <AppButton
                  title={translations.deleteTransfer}
                  nativeGlass
                  rightIcon="delete"
                  keepTitleCentered
                  variant="danger"
                  disabled={loadingRate || pendingAction === 'save'}
                  loading={pendingAction === 'delete'}
                  onPress={confirmDelete}
                />
              )}
              <AppButton
                title={translations.cancel}
                nativeGlass
                rightIcon="cancel"
                keepTitleCentered
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
  screen: { flex: 1 },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 26, fontWeight: '600' },
  field: { gap: 6 },
  label: { fontSize: 15, fontWeight: '600' },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16
  },
  description: {
    minHeight: 48,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  or: {
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 2
  },
  rateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rateField: { flex: 2, minWidth: 0 },
  rateButton: { flex: 1, minWidth: 0 },
  actions: { gap: 8 },
  rateLabel: {
    marginTop: -22,
    marginBottom: 0,
  },
});
