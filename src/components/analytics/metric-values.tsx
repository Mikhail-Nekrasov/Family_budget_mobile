import { StyleSheet, Text, View } from 'react-native';

export const ANALYTICS_LABEL_FLEX = 1;

type Props = {
  amount: string;
  share?: string;
  textColor: string;
  shareColor: string;
};

export function MetricValues({ amount, share, textColor, shareColor }: Props) {
  return (
    <View style={styles.values}>
      {share !== undefined && (
        <Text numberOfLines={1} style={[styles.share, { color: shareColor }]}>
          {share}
        </Text>
      )}
      <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.amount, { color: textColor }]}>
        {amount}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  values: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4 },
  share: { flexShrink: 0, textAlign: 'left', fontSize: 13, fontVariant: ['tabular-nums'] },
  amount: { flex: 1, textAlign: 'right', fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
