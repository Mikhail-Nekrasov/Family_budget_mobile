import { Text, View } from 'react-native';

import { IconBadge } from '@/components/icons/icon-badge';
import { CATEGORY_ICON_SECTIONS } from '@/constants/category-icon-catalog';
import { DEFAULT_CATEGORIES } from '@/constants/default-categories';
import { useLanguage } from '@/hooks/use-language';

export function ConflictIconPreview({ kind, iconKey, iconColor, color }: {
  kind: 'account' | 'category'; iconKey?: string | null; iconColor?: string | null; color: string;
}) {
  const { language, translations } = useLanguage();
  const custom = CATEGORY_ICON_SECTIONS.flatMap((section) => [...section.icons])
    .find((icon) => icon.key === iconKey);
  const standard = DEFAULT_CATEGORIES.find((item) => item.iconKey === iconKey);
  const accountName = iconKey && Object.hasOwn(translations.accountIcons, iconKey)
    ? translations.accountIcons[iconKey as keyof typeof translations.accountIcons] : iconKey;
  const name = kind === 'account' ? accountName ?? ''
    : custom?.label[language] ?? (standard ? translations.defaultCategories[standard.key] : iconKey ?? '');
  const none = { en: 'No color', ru: 'Без цвета', fi: 'Ei väriä' }[language];
  return (
    <View style={{ gap: 8 }}>
      {iconKey ? <IconBadge kind={kind} iconKey={iconKey} color={iconColor ?? null} /> : (
        <View style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 1,
          borderColor: color, backgroundColor: iconColor ?? 'transparent' }} />
      )}
      {name !== '' && <Text style={{ color }}>{name}</Text>}
      {iconColor !== undefined && <Text style={{ color }}>{iconColor ?? none}</Text>}
    </View>
  );
}
