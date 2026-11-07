import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';

import {
  ACCOUNT_CURRENCY_SYMBOLS,
  ACCOUNT_ICON_PATHS,
  type AccountIconKey,
} from '@/constants/account-icons';

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
  const symbol = iconKey.startsWith('currency:')
    ? iconKey.slice(9)
    : '';

  const isCurrencyIcon = ACCOUNT_CURRENCY_SYMBOLS.includes(symbol);
  const currencyScale = 1.7;
  const svgSize = isCurrencyIcon ? size * currencyScale : size;

  const symbolFontSize = symbol.length > 1 ? 12 : 17;
  const symbolBaseline = symbol.length > 1 ? 15.5 : 17;

  const path = Object.prototype.hasOwnProperty.call(
    ACCOUNT_ICON_PATHS,
    iconKey,
  )
    ? ACCOUNT_ICON_PATHS[iconKey as AccountIconKey]
    : ACCOUNT_ICON_PATHS.cash;

  return (
    <Svg
      width={svgSize}
      height={svgSize}
      viewBox="0 0 24 24"
      accessible={false}
      accessibilityElementsHidden
    >
      {isCurrencyIcon ? (
        <>
          <Circle
            cx={12}
            cy={12}
            r={10}
            fill="none"
            stroke={color}
            strokeWidth={1}
          />
          <SvgText
            x={12}
            y={12 + (symbolBaseline - 12) / currencyScale}
            textAnchor="middle"
            fill={color}
            fontSize={symbolFontSize / currencyScale}
            fontWeight="500"
          >
            {symbol}
          </SvgText>
        </>
      ) : (
        <Path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </Svg>
  );
}