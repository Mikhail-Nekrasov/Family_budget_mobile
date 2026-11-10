import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ActionIcon } from '@/components/icons/action-icon';
import { IconBadge } from '@/components/icons/icon-badge';
import { useLanguage } from '@/hooks/use-language';
import type { TransferHistoryItem } from '@/models/transfer';
import { formatExchangeRate, formatMoney } from '@/utils/format-money';
import { rateFromAmounts } from '@/utils/money';

function TransferAccountBadge({
  iconKey, iconColor, archived, textColor, badgeColor,
}: {
  iconKey: string;
  iconColor: string | null;
  archived: boolean;
  textColor: string;
  badgeColor: string;
}) {
  return (
    <View style={styles.accountIcon}>
      <IconBadge kind="account" iconKey={iconKey} color={iconColor} size={32} />
      {archived && (
        <View style={[styles.archiveBadge, { backgroundColor: badgeColor, borderColor: badgeColor }]}>
          <ActionIcon name="archive" color={textColor} size={12} />
        </View>
      )}
    </View>
  );
}

export function TransferHistoryCard({
  transfer,
  onPress,
}: { transfer: TransferHistoryItem; onPress: () => void }) {
  const { locale, translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const palette = dark
    ? { text: '#F0F3FA', muted: '#A8B3C5', top: '#FFFFFF73', left: '#FFFFFF40', edge: '#FFFFFF1F', highlight: '#FFFFFF2E' }
    : { text: '#192238', muted: '#6C7890', top: '#FFFFFFF2', left: '#FFFFFFBF', edge: '#365BBC2E', highlight: '#FFFFFFA6' };
  const date = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(transfer.dateTime));
  const debit = formatMoney(transfer.amountMinor, transfer.sourceCurrencyCode, locale);
  const crossCurrency = transfer.sourceCurrencyCode !== transfer.targetCurrencyCode;
  const credit = crossCurrency
    ? formatMoney(transfer.targetAmountMinor, transfer.targetCurrencyCode, locale)
    : null;
  const rate = crossCurrency
    ? formatExchangeRate(rateFromAmounts(
      transfer.amountMinor, transfer.sourceCurrencyCode,
      transfer.targetAmountMinor, transfer.targetCurrencyCode,
    ), transfer.sourceCurrencyCode, transfer.targetCurrencyCode, locale)
    : null;

  const archiveSuffix = ` (${translations.accountArchived})`;
  const badgeColor = dark ? '#29354B' : '#FFFFFF';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={[
        translations.editTransfer,
        date,
        `${translations.transferFrom}: ${transfer.fromName}${transfer.fromArchivedAt ? archiveSuffix : ''}, ${debit}`,
        `${translations.transferTo}: ${transfer.toName}${transfer.toArchivedAt ? archiveSuffix : ''}${credit ? `, ${credit}` : ''}`,
        rate,
      ].filter(Boolean).join('. ')}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <BlurView
        intensity={15}
        tint="default"
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, styles.blur]}
      />
      <LinearGradient
        colors={[palette.highlight, '#FFFFFF00']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        pointerEvents="none"
        style={styles.highlight}
      />
      <View
        pointerEvents="none"
        style={[styles.edge, {
          borderTopColor: palette.top,
          borderLeftColor: palette.left,
          borderRightColor: palette.edge,
          borderBottomColor: palette.edge,
        }]}
      />
      <View style={styles.metadata}>
        <Text style={[styles.details, styles.date, { color: palette.muted }]}>{date}</Text>
        {rate && <Text style={[styles.details, styles.rate, { color: palette.muted }]}>{rate}</Text>}
      </View>
      <View style={styles.accountRow}>
        <TransferAccountBadge
          iconKey={transfer.fromIconKey}
          iconColor={transfer.fromIconColor}
          archived={transfer.fromArchivedAt !== null}
          textColor={palette.text}
          badgeColor={badgeColor}
        />
        <Text numberOfLines={2} style={[styles.accountName, { color: palette.text }]}>
          {transfer.fromName}
          {transfer.fromArchivedAt && <Text style={{ color: palette.muted }}>{archiveSuffix}</Text>}
        </Text>
        <Text style={[styles.amount, { color: palette.text }]}>{debit}</Text>
      </View>
      <View accessible={false} style={styles.direction}>
        <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}>
          <Path d="M12 4v15m-5-5 5 5 5-5" fill="none" stroke={palette.muted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={styles.accountRow}>
        <TransferAccountBadge
          iconKey={transfer.toIconKey}
          iconColor={transfer.toIconColor}
          archived={transfer.toArchivedAt !== null}
          textColor={palette.text}
          badgeColor={badgeColor}
        />
        <Text numberOfLines={2} style={[styles.accountName, { color: palette.text }]}>
          {transfer.toName}
          {transfer.toArchivedAt && <Text style={{ color: palette.muted }}>{archiveSuffix}</Text>}
        </Text>
        {credit && <Text style={[styles.amount, { color: palette.text }]}>{credit}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 14,
    gap: 4,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.75 },
  metadata: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  date: { flexShrink: 1 },
  rate: { flexShrink: 1, textAlign: 'right' },
  blur: { opacity: 0.6 },
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
    ...StyleSheet.absoluteFill,
    borderWidth: 1,
    borderRadius: 16,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  accountIcon: {
    width: 41,
    height: 36,
    justifyContent: 'center',
  },
  archiveBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 18,
    height: 18,
    borderWidth: 1,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  direction: { paddingLeft: 8 },
  accountName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  amount: {
    flexShrink: 1,
    textAlign: 'right',
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  details: { fontSize: 13 },
});
