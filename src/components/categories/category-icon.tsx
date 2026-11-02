import Svg, { Path } from 'react-native-svg';

const ICON_PATHS = {
  category:
    'M3 3H9V9H3Z M15 3H21V9H15Z ' +
    'M3 15H9V21H3Z M15 15H21V21H15Z',

  groceries:
    'M2 3H5L8 16H19L22 7H6 ' +
    'M10 20H10.01 M18 20H18.01',

  housing:
    'M3 11L12 3L21 11 M5 10V21H19V10 ' +
    'M9 21V14H15V21',

  transport:
    'M5 16L3 15V11L6 5H18L21 11V15L19 16 ' +
    'M3 11H21 M5 16H19 M6 16V19 M18 16V19 ' +
    'M7 13H8 M16 13H17',

  food:
    'M4 3V8Q4 11 7 11Q10 11 10 8V3 ' +
    'M7 3V21 M18 3V21 M18 3Q13 7 15 12H18',

  salary:
    'M3 7H21V21H3Z M8 7V3H16V7 ' +
    'M3 12Q12 17 21 12 M12 12V16',

  leisure:
    'M12 3L14.8 8.7L21 9.6L16.5 14L17.6 20.2 ' +
    'L12 17.3L6.4 20.2L7.5 14L3 9.6L9.2 8.7Z',

  health:
    'M9 3H15V9H21V15H15V21H9V15H3V9H9Z',
};

type CategoryIconProps = {
  iconKey: string;
  color: string;
  size?: number;
};

function getIconPath(iconKey: string): string {
  if (Object.prototype.hasOwnProperty.call(ICON_PATHS, iconKey)) {
    return ICON_PATHS[iconKey as keyof typeof ICON_PATHS];
  }

  return ICON_PATHS.category;
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
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}