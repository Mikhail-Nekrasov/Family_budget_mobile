import { useLanguage } from '@/hooks/use-language';
import { useId, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Svg, { Circle, Defs, G, Pattern } from 'react-native-svg';

import { ChartCenter } from '@/components/chart-center';
import { NEGATIVE_SECTOR_COLOR } from '@/constants/chart-colors';
import { formatMoney } from '@/utils/format-money';
import { playSelectionFeedback } from '@/utils/haptic-feedback';

export type ChartSegment = {
  id: string;
  name: string;
  color: string | null;
  amountMinor: number;
};

type Props = {
  segments: ChartSegment[];
  label: string;
  currencyCode: string;
  textColor: string;
  mutedColor: string;
  trackColor: string;
  size?: number;
  available?: boolean;
  loading?: boolean;
  totalAmountMinor?: number;
};


export function CategoryChart({ segments, label, currencyCode, textColor, mutedColor, trackColor, size = 240, available = true, loading = false, totalAmountMinor }: Props) {
  const { locale, translations } = useLanguage();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const dotPatternId = `category-dots-${useId().replace(/[^a-zA-Z0-9_-]/g, '')}`;

  const total = segments.reduce(
    (sum, segment) => sum + Math.abs(segment.amountMinor),
    0,
  );

  const canSelect = available && total > 0;
  const selectedSegment = canSelect
    ? segments.find((segment) => segment.id === selectedId)
    : undefined;

  const shownLabel = selectedSegment?.name ?? label;
  const shownAmount = formatMoney(
    selectedSegment?.amountMinor ?? totalAmountMinor ?? total,
    currencyCode,
    locale,
  );

  const radius = 82;
  const ringWidth = 25;
  const circumference = 2 * Math.PI * radius;
  let accumulated = 0;
  const sectorRanges: { segment: ChartSegment; start: number; end: number }[] = [];

  for (const segment of segments) {
    const start = accumulated;
    accumulated += Math.abs(segment.amountMinor);
    sectorRanges.push({ segment, start, end: accumulated });
  }

  const selectedRange = sectorRanges.find(
    ({ segment }) => segment.id === selectedSegment?.id,
  );

  const shift = 4;
  const midpoint = selectedRange
    ? ((selectedRange.start + selectedRange.end) / 2 / total) * 2 * Math.PI - Math.PI / 2
    : 0;

  const isShifted = selectedRange !== undefined &&
    Math.abs(selectedRange.segment.amountMinor) < total;

  const shiftX = isShifted ? Math.cos(midpoint) * shift : 0;
  const shiftY = isShifted ? Math.sin(midpoint) * shift : 0;

  const sectorsToDraw = selectedRange
    ? [...sectorRanges.filter((range) => range !== selectedRange), selectedRange]
    : sectorRanges;

  function selectSegment(nextId: string | null) {
    if (nextId !== (selectedSegment?.id ?? null)) {
      setSelectedId(nextId);
      playSelectionFeedback();
    }
  }

  function ringAmountAt(x: number, y: number): number | null {
    if (Math.abs(Math.hypot(x, y) - radius) > ringWidth / 2) {
      return null;
    }

    const fraction = (Math.atan2(y, x) / (2 * Math.PI) + 1.25) % 1;
    return fraction * total;
  }

  function handleRingPress({ nativeEvent }: GestureResponderEvent) {
    const x = nativeEvent.locationX * 200 / size - 100;
    const y = nativeEvent.locationY * 200 / size - 100;

    if (selectedRange) {
      const amount = ringAmountAt(x - shiftX, y - shiftY);

      if (amount !== null && amount >= selectedRange.start && amount < selectedRange.end) {
        selectSegment(null);
        return;
      }
    }

    const amount = ringAmountAt(x, y);
    if (amount === null) return;

    const range = sectorRanges.find(({ start, end }) => amount >= start && amount < end);
    if (range) {
      selectSegment(range === selectedRange ? null : range.segment.id);
    }
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[styles.chart, { width: size, height: size }]}
        accessible
        accessibilityLabel={`${shownLabel}: ${available ? shownAmount : loading ? translations.loading : translations.conversionUnavailable}`}
        accessibilityRole={canSelect ? 'adjustable' : undefined}
        accessibilityActions={canSelect
          ? [{ name: 'increment' }, { name: 'decrement' }]
          : undefined}
        onAccessibilityAction={({ nativeEvent }) => {
          if (!canSelect) return;

          const index = segments.findIndex(
            (segment) => segment.id === selectedSegment?.id,
          ) + 1;
          const direction = nativeEvent.actionName === 'increment' ? 1 : -1;
          const count = segments.length + 1;
          const next = (index + direction + count) % count;

          selectSegment(next === 0 ? null : segments[next - 1].id);
        }}
      >
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          <Defs>
            <Pattern
              id={dotPatternId}
              width={6}
              height={6}
              viewBox="0 0 6 6"
              patternUnits="userSpaceOnUse"
            >
              <Circle cx={3} cy={3} r={0.9} fill={textColor} />
            </Pattern>
          </Defs>

          {(!available || total === 0) && (
            <Circle
              cx={100}
              cy={100}
              r={radius}
              fill="none"
              stroke={trackColor}
              strokeWidth={19}
            />
          )}

          {canSelect && sectorsToDraw.map(({ segment, start }) => {
            const weight = Math.abs(segment.amountMinor);
            const length = weight / total * circumference;
            const offset = start / total * circumference;
            const isFullCircle = weight === total;
            const isSelected = selectedSegment?.id === segment.id;
            const centerX = 100 + (isSelected ? shiftX : 0);
            const centerY = 100 + (isSelected ? shiftY : 0);

            const opacity = !selectedSegment || isSelected ? 1 : 0.45;
            if (segment.amountMinor < 0) {
              return (
                <G key={segment.id} opacity={opacity}>
                  {[
                    { key: 'outer', bandRadius: radius + ringWidth / 4, color: NEGATIVE_SECTOR_COLOR },
                    { key: 'inner', bandRadius: radius - ringWidth / 4, color: segment.color ?? `url(#${dotPatternId})` },
                  ].map(({ key, bandRadius, color }) => {
                    const bandCircumference = 2 * Math.PI * bandRadius;
                    const bandLength = weight / total * bandCircumference;

                    return (
                      <Circle
                        key={key}
                        cx={centerX}
                        cy={centerY}
                        r={bandRadius}
                        fill="none"
                        stroke={color}
                        strokeWidth={ringWidth / 2}
                        strokeDasharray={isFullCircle ? undefined : [bandLength, bandCircumference - bandLength]}
                        strokeDashoffset={-start / total * bandCircumference}
                        rotation={-90}
                        originX={centerX}
                        originY={centerY}
                      />
                    );
                  })}
                </G>
              );
            }

            return (
              <Circle
                key={segment.id}
                cx={centerX}
                cy={centerY}
                r={radius}
                fill="none"
                stroke={segment.color ?? `url(#${dotPatternId})`}
                strokeWidth={ringWidth}
                strokeOpacity={opacity}
                strokeDasharray={isFullCircle ? undefined : [length, circumference - length]}
                strokeDashoffset={-offset}
                rotation={-90}
                originX={centerX}
                originY={centerY}
              />
            );
          })}
        </Svg>
        <ChartCenter
          label={shownLabel}
          amount={available ? shownAmount : '—'}
          textColor={textColor}
          mutedColor={mutedColor}
          notice={available ? undefined : loading ? translations.loading : translations.conversionUnavailable}
        />

        {canSelect && (
          <Pressable
            accessible={false}
            focusable={false}
            style={StyleSheet.absoluteFill}
            onPress={handleRingPress}
          />
        )}
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  chart: {
    position: 'relative'
  },
});
