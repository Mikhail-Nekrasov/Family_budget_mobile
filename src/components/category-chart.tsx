import { useLanguage } from '@/hooks/use-language';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { formatMoney } from '@/utils/format-money';

export type ChartSegment = {
  id: string;
  name: string;
  color: string;
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
};

export function CategoryChart({ segments, label, currencyCode, textColor, mutedColor, trackColor, size = 240, available = true, loading = false }: Props) {
  const { locale, translations } = useLanguage();
  const total = segments.reduce(
    (sum, segment) => sum + segment.amountMinor,
    0,
  );

  const formattedTotal = formatMoney(
    total,
    currencyCode,
    locale,
  );
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View style={[styles.chart, { width: size, height: size }]} accessible accessibilityLabel={`${label}: ${available ? formattedTotal : loading ? translations.loading : translations.conversionUnavailable}`}>
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          <Circle cx={100} cy={100} r={radius} fill="none" stroke={trackColor} strokeWidth={19} />
          {available && total > 0 && segments.map((segment) => {
            const length = segment.amountMinor / total * circumference;
            const start = offset;
            offset += length;
            return <Circle key={segment.id} cx={100} cy={100} r={radius} fill="none"
              stroke={segment.color} strokeWidth={25}
              strokeDasharray={[length, circumference - length]}
              strokeDashoffset={-start} rotation={-90} originX={100} originY={100} />;
          })}
        </Svg>
        <View style={styles.center} pointerEvents="none">
          <Text style={[styles.label, { color: mutedColor }]}>{label}</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55}
            style={[styles.total, { color: textColor }]}>{available ? formattedTotal : '—'}</Text>
          {!available && (
            <Text style={[styles.notice, { color: mutedColor }]}>
              {loading ? translations.loading : translations.conversionUnavailable}
            </Text>
          )}
        </View>
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
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: '17%', gap: 8 },
  notice: { fontSize: 12, textAlign: 'center' },
  label: { fontSize: 13, textAlign: 'center' },
  total: { fontSize: 25, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
