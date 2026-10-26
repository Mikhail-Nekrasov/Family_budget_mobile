import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { accounts, formatAmount } from '@/data/home-demo';
import { useLanguage } from '@/hooks/use-language';

export default function AccountsScreen() {
  const { locale } = useLanguage();
  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        background: '#111722',
        card: '#1C2432',
        text: '#F0F3FA',
        muted: '#A8B3C5',
      }
    : {
        background: '#F5F6F9',
        card: '#FFFFFF',
        text: '#192238',
        muted: '#6C7890',
      };

  return (
    <SafeAreaView
      edges={['left', 'right', 'bottom']}
      style={[
        styles.screen,
        { backgroundColor: palette.background },
      ]}
    >
      <ScrollView contentContainerStyle={styles.content}>
        {Object.entries(accounts).map(([id, account]) => (
          <View
            key={id}
            style={[
              styles.account,
              { backgroundColor: palette.card },
            ]}
          >
            <Text
              style={[
                styles.accountName,
                { color: palette.text },
              ]}
            >
              {account.name}
            </Text>

            <View style={styles.balanceGroup}>
              <Text
                style={[
                  styles.balance,
                  { color: palette.text },
                ]}
              >
                {formatAmount(account.balanceCents, locale)}
              </Text>

              <Text
                accessibilityLabel={account.currencyCode}
                style={[
                  styles.currency,
                  { color: palette.muted },
                ]}
              >
                {account.currencySymbol}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
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
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    padding: 16,
    borderRadius: 16,
  },
  accountName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  currency: {
    fontSize: 15,
  },
    balanceGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  balance: {
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});