import { formatAmount } from '@/data/home-demo';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export type ChartSegment = {
  id: string;
  name: string;
  color: string;
  amountCents: number;
};

type Props = {
  segments: ChartSegment[];
  label: string;
  currencySymbol: string;
  textColor: string;
  mutedColor: string;
  trackColor: string;
};

export function CategoryChart({ segments, label, currencySymbol, textColor, mutedColor, trackColor }: Props) {
  const total = segments.reduce((sum, segment) => sum + segment.amountCents, 0);
  const radius = 82;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <View style={styles.container}>
      <View style={styles.chart} accessible accessibilityLabel={`${label}: ${formatAmount(total)} ${currencySymbol}`}>
        <Svg width="100%" height="100%" viewBox="0 0 200 200">
          <Circle cx={100} cy={100} r={radius} fill="none" stroke={trackColor} strokeWidth={19} />
          {total > 0 && segments.map((segment) => {
            const length = segment.amountCents / total * circumference;
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
            style={[styles.total, { color: textColor }]}>{formatAmount(total)} {currencySymbol}</Text>
        </View>
      </View>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 1
  },
  chart: {
    width: '100%',
    maxWidth: 240,
    aspectRatio: 1
  },
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'center', alignItems: 'center', paddingHorizontal: '17%', gap: 8 },
  label: { fontSize: 13, textAlign: 'center' },
  total: { fontSize: 25, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
