import { View, useColorScheme } from 'react-native';

import { AccountIcon } from '@/components/accounts/account-icon';
import { CategoryIcon } from '@/components/categories/category-icon';
import { iconForeground } from '@/constants/icon-colors';

type Props = {
  kind: 'account' | 'category';
  iconKey: string;
  color: string | null;
  size?: number;
};

export function IconBadge({
  kind,
  iconKey,
  color,
  size = 44,
}: Props) {
  const dark = useColorScheme() === 'dark';
  const foreground = color ? iconForeground(color) : dark ? '#F0F3FA' : '#192238';
  const Icon = kind === 'account'
    ? AccountIcon
    : CategoryIcon;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color ?? 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Icon
        iconKey={iconKey}
        color={foreground}
        size={Math.round(size * 0.58)}
      />
    </View>
  );
}