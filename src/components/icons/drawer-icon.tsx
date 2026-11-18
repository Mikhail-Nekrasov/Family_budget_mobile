import type { ColorValue } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';

type DrawerIconName = 'home' | 'accounts' | 'categories' | 'exchange' | 'analytics' | 'settings';

type DrawerIconProps = {
  name: DrawerIconName;
  color: ColorValue | null;
};

/** Shared outline weight, including the approved light-outline category cart. */
export function DrawerIcon({ name, color: tint }: DrawerIconProps) {
  const color = tint ?? '#273142';
  return (
    <Svg width={24} height={24} viewBox="0 0 64 64" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" accessible={false}>
      {name === 'categories' ? (
        <>
          <Path d="M8 14h10v28h40V32" />
          <Rect x={27} y={27} width={10} height={10} rx={0.4} />
          <Rect x={37} y={27} width={10} height={10} rx={0.4} />
          <Rect x={32} y={17} width={10} height={10} rx={0.4} />
          <Circle cx={26} cy={47} r={4} />
          <Circle cx={51} cy={47} r={4} />
        </>
      ) : (
        <G scale={64 / 24} strokeWidth={0.975}>
          {name === 'home' && <Path d="m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9" />}
          {name === 'accounts' && (
            <>
              <Path d="M20 8H5a2 2 0 0 1 0-4h13v4M3 6v13a2 2 0 0 0 2 2h15V8M20 12h-5v5h5" />
              <Circle cx={17} cy={14.5} r={0.6} fill={color} stroke="none" />
            </>
          )}
          {name === 'exchange' && (
            <>
              <Path d="M9 9h6m-2.25-2.25L15 9l-2.25 2.25M15 15.75H9m2.25-2.25L9 15.75l2.25 2.25" />
              <SvgText x={1.5} y={15.75} fontSize={9.75} fontWeight="500" fill={color} stroke="none">$</SvgText>
              <SvgText x={16.5} y={15.75} fontSize={9.75} fontWeight="500" fill={color} stroke="none">€</SvgText>
            </>
          )}
          {name === 'analytics' && (
            <>
              <Path d="M10 3a9 9 0 1 0 11 11H10ZM14 2v8h8a9 9 0 0 0-8-8Z" />
            </>
          )}
          {name === 'settings' && (
            <>
              <Path d="m9 3-.5 2-1.8 1-2-.5-2 3.5 1.5 1.5v3L2.7 15l2 3.5 2-.5 1.8 1 .5 2h4l.5-2 1.8-1 2 .5 2-3.5-1.5-1.5v-3L19.3 9l-2-3.5-2 .5-1.8-1-.5-2Z" />
              <Circle cx={11} cy={12} r={3} />
            </>
          )}
        </G>
      )}
    </Svg>
  );
}
