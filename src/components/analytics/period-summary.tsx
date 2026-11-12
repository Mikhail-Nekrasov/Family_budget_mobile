import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ANALYTICS_LABEL_FLEX, MetricValues } from '@/components/analytics/metric-values';
import { SummaryIcon, type SummaryIconKind } from '@/components/analytics/summary-icon';
import { ChartCenter } from '@/components/chart-center';
import { NEGATIVE_SECTOR_COLOR, SUMMARY_INCOME_COLOR, SUMMARY_INCOME_OVERSPENT_COLOR } from '@/constants/chart-colors';
import { useLanguage } from '@/hooks/use-language';
import { formatMoney } from '@/utils/format-money';
import { playSelectionFeedback } from '@/utils/haptic-feedback';
import {
  SUMMARY_OUTER_RADIUS,
  SUMMARY_RING_WIDTH,
  summarySectorWidth,
  summarySectors,
  summarySelectionAt,
  visibleSummarySectors,
  type SummarySelection,
} from '@/utils/summary-ring';

type Props = {
  size: number;
  currency: string;
  income: number | null;
  expenses: number | null;
  loading: boolean;
  failed: boolean;
};

export function PeriodSummary({ size, currency, income, expenses, loading, failed }: Props) {
  const [selected, setSelected] = useState<SummarySelection | null>(null);
  const { locale, translations } = useLanguage();
  const dark = useColorScheme() === 'dark';
  const palette = dark
    ? { text: '#F0F3FA', muted: '#A8B3C5', card: '#1C2432', border: '#333F52' }
    : { text: '#192238', muted: '#53617A', card: '#FFFFFF', border: '#E0E5EE' };
  const available = income !== null && expenses !== null;
  const savings = available ? Math.max(0, income - expenses) : null;
  const over = available && expenses > income;
  const ratio = available && income > 0 ? expenses / income : null;
  const splitRing = available && expenses > 0 && expenses < income;
  const sectors = available ? summarySectors(income, expenses) : [];
  const incomeOnly = available && income > 0 && expenses === 0;
  const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 1 });
  const amount = (value: number | null) => value === null ? '—' : formatMoney(value, currency, locale);
  const rows: { kind: SummaryIconKind; label: string; value: number | null; share: number | null; color: string }[] = [
    { kind: 'income', label: translations.income, value: income, share: null, color: SUMMARY_INCOME_OVERSPENT_COLOR },
    { kind: 'expenses', label: translations.expenses, value: expenses, share: ratio, color: NEGATIVE_SECTOR_COLOR },
    {
      kind: 'savings',
      label: translations.analyticsSavings,
      value: savings,
      share: ratio !== null && !over ? 1 - ratio : null,
      color: SUMMARY_INCOME_COLOR,
    },
  ];
  const selectable = available && (income > 0 || expenses > 0);
  const choices: (SummarySelection | null)[] = incomeOnly
    ? [null, 'income']
    : [null, ...sectors.map((sector) => sector.id)];
  if (splitRing) choices.push('income');
  const activeSelection = choices.includes(selected) ? selected : null;
  const visibleSectors = visibleSummarySectors(sectors, activeSelection, splitRing, incomeOnly);
  const shown = rows.find((row) => row.kind === (activeSelection ?? 'savings'))!;
  const notice = available ? undefined
    : failed ? translations.loadEntriesError
      : loading ? translations.loading : translations.conversionUnavailable;

  function select(next: SummarySelection | null) {
    if (next === activeSelection) return;
    setSelected(next);
    playSelectionFeedback();
  }


  return (
    <View style={styles.content}>
      <View
        style={[styles.chart, { width: size, height: size }]}
        accessible
        accessibilityLabel={`${shown.label}: ${notice ?? amount(shown.value)}`}
        accessibilityRole={selectable ? 'adjustable' : undefined}
        accessibilityActions={selectable ? [{ name: 'increment' }, { name: 'decrement' }] : undefined}
        onAccessibilityAction={({ nativeEvent }) => {
          if (!selectable) return;
          const delta = nativeEvent.actionName === 'increment' ? 1 : -1;
          const next = (choices.indexOf(activeSelection) + delta + choices.length) % choices.length;
          select(choices[next]);
        }}
      >
        <Svg width={size} height={size} viewBox="0 0 200 200" accessible={false}>
          {sectors.length === 0 && (
            <Circle cx={100} cy={100} r={SUMMARY_OUTER_RADIUS} strokeWidth={SUMMARY_RING_WIDTH} stroke={palette.border} fill="none" />
          )}
          {visibleSectors.map((sector) => {
            const length = 2 * Math.PI * sector.radius;
            const dimmed = activeSelection !== null && sector.id !== activeSelection;

            return (
              <Circle
                key={`${sector.id}-${sector.fraction === 1 ? 'full' : 'arc'}`}
                cx={100}
                cy={100}
                r={sector.radius}
                strokeWidth={summarySectorWidth(sector.id)}
                stroke={rows.find((row) => row.kind === sector.id)?.color}
                strokeOpacity={dimmed ? 0.35 : 1}
                strokeDasharray={sector.fraction < 1 ? [length * sector.fraction, length] : undefined}
                strokeDashoffset={-length * sector.start}
                rotation={-90}
                originX={100}
                originY={100}
                fill="none"
              />
            );
          })}
        </Svg>
        <ChartCenter
          label={shown.label}
          amount={amount(shown.value)}
          textColor={palette.text}
          mutedColor={palette.muted}
          notice={notice}
        />
        {selectable && (
          <Pressable
            accessible={false}
            focusable={false}
            style={StyleSheet.absoluteFill}
            onPress={({ nativeEvent }) => {
              const x = nativeEvent.locationX * 200 / size - 100;
              const y = nativeEvent.locationY * 200 / size - 100;
              const hit = summarySelectionAt(x, y, visibleSectors);
              if (hit) {
                if (incomeOnly) {
                  select(activeSelection === 'income' ? null : 'income');
                } else {
                  select(hit === 'center' || hit === activeSelection ? null : hit);
                }
              }
            }}
          />
        )}
      </View>
      {rows.map((row) => (
        <View key={row.kind} style={[styles.row, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <View style={styles.labelGroup}>
            <SummaryIcon kind={row.kind} color={row.color} />
            <Text style={[styles.label, { color: palette.text }]}>{row.label}</Text>
          </View>
          <MetricValues
            amount={amount(row.value)}
            share={row.share === null ? undefined : percent.format(row.share)}
            textColor={palette.text}
            shareColor={palette.muted}
          />
        </View>
      ))}
      {over && (
        <View style={styles.warning}>
          <Text accessibilityLiveRegion="polite" style={[styles.message, { color: palette.muted }]}>
            {translations.analyticsOverspent}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 8 },
  chart: { alignSelf: 'center', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, paddingHorizontal: 11, paddingVertical: 12, borderWidth: 1, borderRadius: 16 },
  labelGroup: { flex: ANALYTICS_LABEL_FLEX, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { flex: 1, marginRight: 8, fontSize: 16, fontWeight: '500' },
  warning: { minHeight: 28, borderWidth: 1, borderColor: NEGATIVE_SECTOR_COLOR, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 4, justifyContent: 'center' },
  message: { fontSize: 12, textAlign: 'center' },
});
