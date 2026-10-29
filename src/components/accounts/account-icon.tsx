import Svg, { Circle, Path, Rect } from 'react-native-svg';

type Props = {
  iconKey: string;
  color: string;
  size?: number;
};

export function AccountIcon({
  iconKey,
  color,
  size = 24,
}: Props) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessible={false}
      accessibilityElementsHidden
    >
      <Rect
        x={2}
        y={5}
        width={20}
        height={14}
        rx={3}
        fill="none"
        stroke={color}
        strokeWidth={1.7}
      />

      {iconKey === 'cash' && (
        <Circle
          cx={12}
          cy={12}
          r={3}
          fill="none"
          stroke={color}
          strokeWidth={1.7}
        />
      )}

      {iconKey === 'card' && (
        <Path
          d="M2 10H22 M6 15H10"
          fill="none"
          stroke={color}
          strokeWidth={1.7}
        />
      )}
    </Svg>
  );
}