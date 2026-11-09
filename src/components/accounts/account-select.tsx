import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { IconBadge } from '@/components/icons/icon-badge';
import { useLanguage } from '@/hooks/use-language';
import type { Account } from '@/models/account';
import { formatMoney } from '@/utils/format-money';
import { playSelectionFeedback } from '@/utils/haptic-feedback';

type AccountSelectProps = {
  accounts: readonly Account[];
  value: string | null;
  onChange: (syncId: string) => void;
  disabled?: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onTouchInside: () => void;
};

export function AccountSelect({
  accounts,
  value,
  onChange,
  disabled = false,
  expanded,
  onExpandedChange,
  onTouchInside,
}: AccountSelectProps) {
  const { translations, locale } = useLanguage();
  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        card: '#1C2432',
        text: '#F0F3FA',
        muted: '#A8B3C5',
        border: '#333F52',
        accent: '#A0B8FF',
        selected: 'rgba(160, 184, 255, 0.12)',
      }
    : {
        card: '#FFFFFF',
        text: '#192238',
        muted: '#6C7890',
        border: '#E0E5EE',
        accent: '#365BBC',
        selected: 'rgba(54, 91, 188, 0.08)',
      };

  const selectedAccount = accounts.find(
    (account) => account.syncId === value,
  );

  function formatBalance(account: Account): string {
    return formatMoney(
      account.balanceMinor,
      account.currencyCode,
      locale,
    );
  }

  function selectAccount(syncId: string) {
    if (syncId !== value) playSelectionFeedback();
    onChange(syncId);
    onExpandedChange(false);
  }

  return (
    <View onTouchStartCapture={onTouchInside}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          selectedAccount
            ? `${translations.entryAccount}: ${selectedAccount.name}, ${selectedAccount.currencyCode}`
            : translations.selectAccount
        }
        accessibilityState={{
          expanded: expanded && !disabled,
          disabled,
        }}
        disabled={disabled}
        onPress={() => {
          Keyboard.dismiss();
          onExpandedChange(!expanded);
        }}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: palette.card,
            borderColor: palette.border,
            opacity: disabled ? 0.45 : pressed ? 0.75 : 1,
          },
        ]}
      >
        {selectedAccount && (
          <IconBadge
            kind="account"
            iconKey={selectedAccount.iconKey}
            color={selectedAccount.iconColor}
            size={32}
          />
        )}

        <Text
          numberOfLines={1}
          style={[
            styles.name,
            { color: palette.text },
          ]}
        >
          {selectedAccount?.name ?? translations.selectAccount}
        </Text>

        {selectedAccount && (
          <Text
            style={[
              styles.balance,
              { color: palette.text },
            ]}
          >
            {formatBalance(selectedAccount)}
          </Text>
        )}

        <Text
          accessible={false}
          style={[
            styles.arrow,
            { color: palette.accent },
          ]}
        >
          {expanded && !disabled ? '▴' : '▾'}
        </Text>
      </Pressable>

      {expanded && !disabled && (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator
          style={[
            styles.dropdown,
            {
              backgroundColor: palette.card,
              borderColor: palette.border,
            },
          ]}
        >
          {accounts.map((account) => {
            const selected = account.syncId === value;

            return (
              <Pressable
                key={account.syncId}
                accessibilityRole="radio"
                accessibilityLabel={
                  `${account.name}, ${account.currencyCode}`
                }
                accessibilityState={{ checked: selected }}
                onPress={() => selectAccount(account.syncId)}
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: selected
                      ? palette.selected
                      : 'transparent',
                    opacity: pressed ? 0.75 : 1,
                  },
                ]}
              >
                <IconBadge
                  kind="account"
                  iconKey={account.iconKey}
                  color={account.iconColor}
                  size={32}
                />

                <Text
                  numberOfLines={2}
                  style={[
                    styles.name,
                    {
                      color: selected
                        ? palette.accent
                        : palette.text,
                    },
                  ]}
                >
                  {account.name}
                </Text>

                <Text
                  style={[
                    styles.balance,
                    { color: palette.text },
                  ]}
                >
                  {formatBalance(account)}
                </Text>

                <Text
                  accessible={false}
                  style={[
                    styles.check,
                    { color: palette.accent },
                  ]}
                >
                  {selected ? '✓' : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  name: {
    flex: 1,
    fontSize: 16,
  },
  arrow: {
    fontSize: 20,
  },
  dropdown: {
    maxHeight: 240,
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  check: {
    width: 20,
    textAlign: 'center',
    fontSize: 18,
  },
  balance: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});