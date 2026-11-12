import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';

const AMOUNT_FONT_SIZE = 25;

type Props = {
  label: string;
  amount: string;
  textColor: string;
  mutedColor: string;
  notice?: string;
};

export function ChartCenter({ label, amount, textColor, mutedColor, notice }: Props) {
  const { fontScale } = useWindowDimensions();
  const amountHeight = Math.ceil(32 * fontScale);
  const amountOffset = AMOUNT_FONT_SIZE * fontScale / 2;
  const labelGap = 6;

  return (
    <View style={styles.center} pointerEvents="none">
      <Text
        numberOfLines={2}
        style={[styles.label, { color: mutedColor, marginBottom: amountHeight / 1.5 + labelGap - amountOffset }]}
      >
        {label}
      </Text>
      <View style={[styles.amountSlot, { height: amountHeight, marginTop: amountOffset - amountHeight / 1.5 }]}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.55} style={[styles.total, { color: textColor }]}>
          {amount}
        </Text>
      </View>
      {notice && (
        <Text style={[styles.notice, { color: mutedColor, marginTop: amountOffset + amountHeight / 2 + labelGap }]}>
          {notice}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { ...StyleSheet.absoluteFill, left: '17%', right: '17%' },
  amountSlot: { position: 'absolute', top: '50%', left: 0, right: 0, justifyContent: 'center' },
  notice: { position: 'absolute', top: '50%', left: 0, right: 0, fontSize: 12, textAlign: 'center' },
  label: { position: 'absolute', bottom: '50%', left: 0, right: 0, fontSize: 13, textAlign: 'center' },
  total: { textAlign: 'center', fontSize: AMOUNT_FONT_SIZE, fontWeight: '700', fontVariant: ['tabular-nums'] },
});
