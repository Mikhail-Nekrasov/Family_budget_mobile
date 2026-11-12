import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { iconForeground } from '@/constants/icon-colors';

export type SummaryIconKind = 'income' | 'expenses' | 'savings';

const PATHS: Record<SummaryIconKind, string> = {
  income: 'M3 20h3v-4H3z M10 20h3v-7h-3z M17 20h3V9h-3z M3 12l6-4 4 1 7-6 M16 3h4v4',
  expenses: 'M3 20h3V9H3z M10 20h3v-7h-3z M17 20h3v-4h-3z M3 3l6 5 4-1 7 5 M16 12h4V8',
  savings: 'M9 7 6 3h12l-3 4 M9 7h6c3 3 6 6 6 10 0 3-2 4-5 4H8c-3 0-5-1-5-4 0-4 3-7 6-10Z M12 11v7 M14 12h-3a1.3 1.3 0 0 0 0 2.6h2a1.3 1.3 0 0 1 0 2.6h-3',
};

export function SummaryIcon({ kind, color }: { kind: SummaryIconKind; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Svg width={23} height={23} viewBox="0 0 24 24" accessible={false}>
        <Path d={PATHS[kind]} fill="none" stroke={iconForeground(color)} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
