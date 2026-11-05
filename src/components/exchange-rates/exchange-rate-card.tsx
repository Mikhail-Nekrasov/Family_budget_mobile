import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View, useColorScheme } from 'react-native';

import { useLanguage } from '@/hooks/use-language';
import type { RateListRow } from '@/models/exchange-rate-list';
import { getCurrencySymbol } from '@/utils/format-money';

type Props = {
  row: RateListRow;
  baseCurrency: string;
};

export function ExchangeRateCard({ row, baseCurrency }: Props) {
  const { translations, locale } = useLanguage();
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

  const muted = dark ? '#A8B3C5' : '#6C7890';
  const formatDate = (value: string) => new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
  const dates = [...new Set([row.sourceDate, row.targetDate]
    .filter((value): value is string => value !== null))];
  const rate = row.rate === null ? null : new Intl.NumberFormat(locale, {
    maximumSignificantDigits: 8,
  }).format(row.rate);

  return (
    <View style={styles.card}>
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

      <View style={styles.main}>
        <Text style={[styles.currency, { color: palette.text }]}>
          {row.currencyCode} · {getCurrencySymbol(row.currencyCode)}
        </Text>
        <Text style={[styles.rate, { color: palette.text }]}>
          {rate === null
            ? translations.ratesUnavailable
            : `1 ${getCurrencySymbol(baseCurrency)} = ${rate} ${getCurrencySymbol(row.currencyCode)}`}
        </Text>
      </View>
      <View style={styles.metadata}>
        {row.rate !== null && dates.length === 1 && (
          <Text style={[styles.details, { color: muted }]}>
            {translations.ratesQuoteDate}: {formatDate(dates[0])}
          </Text>
        )}
        {row.rate !== null && dates.length > 1 && row.sourceDate && row.targetDate && (
          <Text style={[styles.details, { color: muted }]}>
            {translations.ratesQuoteDate}: {baseCurrency} {formatDate(row.sourceDate)} · {row.currencyCode} {formatDate(row.targetDate)}
          </Text>
        )}
        {row.rate !== null && row.fetchedAt && (
          <Text style={[styles.details, { color: muted }]}>
            {translations.ratesFetchedAt}: {new Intl.DateTimeFormat(locale, {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            }).format(new Date(row.fetchedAt))}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 16,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  metadata: {
    flex: 1,
    minWidth: 0,
    gap: 6,
    alignItems: 'flex-end',
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
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    borderWidth: 1,
  },
  currency: {
    fontSize: 15,
    fontWeight: '600',
  },
  rate: {
    fontSize: 20,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  details: {
    fontSize: 12,
    textAlign: 'right',
  },
});
