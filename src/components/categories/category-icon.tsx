import Svg, { Path } from 'react-native-svg';

import { CATEGORY_ICON_PATHS } from '@/constants/category-icons';

type CategoryIconProps = {
  iconKey: string;
  color: string;
  size?: number;
};

function getIconPath(iconKey: string): string {
  if (Object.prototype.hasOwnProperty.call(CATEGORY_ICON_PATHS, iconKey)) {
    return CATEGORY_ICON_PATHS[iconKey as keyof typeof CATEGORY_ICON_PATHS];
  }

  return CATEGORY_ICON_PATHS.otherExpense;
}

export function CategoryIcon({
  iconKey,
  color,
  size = 24,
}: CategoryIconProps) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible={false}
      accessibilityElementsHidden
    >
      <Path
        d={getIconPath(iconKey)}
        fill="none"
        stroke={color}
                strokeWidth={
          ({
            car: 1.357,
            transport: 1.4,
            hobbies: 1.1,
          } as Record<string, number>)[iconKey] ?? 1.7
        }
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}