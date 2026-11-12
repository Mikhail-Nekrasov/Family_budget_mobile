import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';

import { EntryCardSurface } from '@/components/entry-card-surface';
import { IconBadge } from '@/components/icons/icon-badge';

type EntryCardProps = {
  title: string;
  accountName: string;
  iconKey: string;
  iconColor: string | null;
  categoryIconKey: string;
  categoryIconColor: string | null;
  categoryName: string;
  amount: string;
  currencyCode: string;
  currencySymbol: string;
  income: boolean;
  accessibilityLabel: string;
  onLayout?: () => void;
  onPress?: () => void;
};

export function EntryCard({
  title,
  accountName,
  iconKey,
  iconColor,
  categoryIconKey,
  categoryIconColor,
  categoryName,
  amount,
  currencyCode,
  currencySymbol,
  income,
  accessibilityLabel,
  onLayout,
  onPress,
}: EntryCardProps) {
  const dark = useColorScheme() === 'dark';

  const palette = dark
    ? {
        text: '#F0F3FA',
        muted: '#A8B3C5',
        accent: '#A0B8FF',
        icon: '#29354B',
        income: '#7BD4B0',
      }
    : {
        text: '#192238',
        muted: '#6C7890',
        accent: '#365BBC',
        icon: '#EAF0FC',
        income: '#217E5D',
      };

  const content = (
    <>
      <EntryCardSurface />

      <View
        accessible
        accessibilityLabel={`${accountName}, ${categoryName}`}
        style={styles.accountIcon}
      >
        <IconBadge
          kind="category"
          iconKey={categoryIconKey}
          color={categoryIconColor}
        />

        <View
          style={[
            styles.cornerBadge,
            {
              borderColor: dark ? '#1C2432' : '#FFFFFF',
              backgroundColor: dark ? '#1C2432' : '#FFFFFF',
            },
          ]}
        >
          <IconBadge
            kind="account"
            iconKey={iconKey}
            color={iconColor}
            size={24}
          />
        </View>
      </View>

      <Text
        numberOfLines={2}
        style={[
          styles.title,
          { color: palette.text },
        ]}
      >
        {title}
      </Text>

      <View style={styles.amountGroup}>
        <Text
          style={[
            styles.amount,
            {
              color: income
                ? palette.income
                : palette.text,
            },
          ]}
        >
          {amount}
        </Text>

        <Text
          accessibilityLabel={currencyCode}
          style={[
            styles.currency,
            { color: palette.muted },
          ]}
        >
          {currencySymbol}
        </Text>
      </View>
    </>
  );

  if (!onPress) {
    return (
      <View accessibilityLabel={accessibilityLabel} onLayout={onLayout} style={styles.card}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onLayout={onLayout}
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.75 : 1 }]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 22,
    borderRadius: 16,
    padding: 14,
    minHeight: 62,
    overflow: 'hidden',
  },
  accountIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  amountGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  currency: {
    fontSize: 16,
  },
  cornerBadge: {
    position: 'absolute',
    right: -16,
    bottom: -5,
    borderWidth: 2,
    borderRadius: 14,
  },
});