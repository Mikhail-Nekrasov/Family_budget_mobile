import { Platform, StyleSheet, Switch, Text, View, useColorScheme } from 'react-native';

type Props = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export function AppSwitch({ label, value, onValueChange, disabled }: Props) {
  const dark = useColorScheme() === 'dark';
  const off = dark ? '#475265' : '#B9C1D0';

  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: dark ? '#F0F3FA' : '#192238' }]}>{label}</Text>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: off, true: '#32965D' }}
        ios_backgroundColor={off}
        thumbColor={Platform.OS === 'ios' ? undefined : '#FFFFFF'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  label: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
});
