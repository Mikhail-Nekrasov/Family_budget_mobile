import Svg, { Path } from 'react-native-svg';

const ACTION_ICON_PATHS = {
  check: 'M5 12l4 4L19 6',
  cancel: 'M19 12H5m6-6-6 6 6 6',
  delete: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7m4-7v7',
  archive: 'M3 4h18v5H3zM5 9v11h14V9M10 13h4',
  restore: 'M8 5l-4 4 4 4M4 9h11a5 5 0 0 1 0 10h-4',
  calendar: 'M4 6h16v14H4zM4 10h16M8 4v4m8-4v4',
  clock: 'M12 3a9 9 0 1 1 0 18 9 9 0 1 1 0-18zM12 7v5l3 2',
  refresh: 'M20 10a8 8 0 0 0-14-4L4 8m0-5v5h5m-5 6a8 8 0 0 0 14 4l2-2m0 5v-5h-5',
  dropdown: 'm6 9 6 6 6-6',
  chest: 'M3 11h18v8H3zM3 11V9a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v2M10 10h4v4h-4z',
  calculator: 'M5 3h14v18H5zM8 7h8M8 11h1m6 0h1m-8 3h1m6 0h1m-8 3h1m6 0h1',
  list: 'M9 6h12M9 12h12M9 18h12M4 6h.1M4 12h.1M4 18h.1',
} as const;

export type ActionIconName = keyof typeof ACTION_ICON_PATHS;

export function ActionIcon({
  name,
  color,
  size = 20,
}: { name: ActionIconName; color: string; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}>
      <Path
        d={ACTION_ICON_PATHS[name]}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
