import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
    useColorScheme,
} from 'react-native';

import { AccountIcon } from '@/components/accounts/account-icon';
import type { Account } from '@/models/account';

type AccountCardProps = {
  account: Account;
  locale: string;
  onPress: () => void;
};

function formatBalance(account: Account, locale: string): string {
  const formatter = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: account.currencyCode,
  });

  const fractionDigits =
    formatter.resolvedOptions().maximumFractionDigits ?? 2;

  return formatter.format(
    account.balanceMinor / 10 ** fractionDigits,
  );
}

export function AccountCard({
  account,
  locale,
  onPress,
}: AccountCardProps) {
  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        text: '#F0F3FA',
        edgeTop: 'rgba(255, 255, 255, 0.45)',
        edgeLeft: 'rgba(255, 255, 255, 0.25)',
        edgeShadow: 'rgba(255, 255, 255, 0.12)',
        highlight: 'rgba(255, 255, 255, 0.18)',
      }
    : {
        text: '#192238',
        edgeTop: 'rgba(255, 255, 255, 0.95)',
        edgeLeft: 'rgba(255, 255, 255, 0.75)',
        edgeShadow: 'rgba(54, 91, 188, 0.18)',
        highlight: 'rgba(255, 255, 255, 0.65)',
      };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      <BlurView
        intensity={15}
        tint="default"
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.blur,
        ]}
      />

      <LinearGradient
        colors={[
          palette.highlight,
          'rgba(255, 255, 255, 0)',
        ]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
        style={styles.highlight}
      />

      <View
        pointerEvents="none"
        style={[
          styles.edge,
          {
            borderTopColor: palette.edgeTop,
            borderLeftColor: palette.edgeLeft,
            borderRightColor: palette.edgeShadow,
            borderBottomColor: palette.edgeShadow,
          },
        ]}
      />

      <View style={styles.icon}>
        <AccountIcon
          iconKey={account.iconKey}
          color={palette.text}
          size={28}
        />
      </View>

      <Text
        style={[
          styles.name,
          { color: palette.text },
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
        {formatBalance(account, locale)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    padding: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  blur: {
    opacity: 0.6,
  },
  highlight: {
    position: 'absolute',
    top: 1,
    left: 1,
    right: 1,
    height: '10%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  edge: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    borderRadius: 16,
    borderWidth: 1,
  },
  icon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  balance: {
    fontSize: 17,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});