import type { DefaultCategoryKey } from '@/constants/default-categories';

export const DEFAULT_ICON_COLOR = '#365BBC';
export const QUICK_ICON_COLORS = [
  DEFAULT_ICON_COLOR, '#397B55', '#B04D45', '#7955A3',
] as const;

// Each row is a color family, ordered from light to dark.
export const ICON_COLOR_ROWS = [
  ['#FDE7E5', '#F8C5BF', '#ECA099', '#D97469', '#B04D45', '#7A312B'],
  ['#FFF0E2', '#FFD9BA', '#F6AF7D', '#F28C46', '#E66F0E', '#B95312'],
  ['#FFF4D5', '#F7E3A6', '#F4B451', '#D98222', '#9B6B20', '#694919'],
  ['#DFEED8', '#B6D6A2', '#8AB879', '#6D9C4C', '#397B55', '#335830'],
  ['#D6EEEE', '#9ED1D2', '#75B9BE', '#4B9C9F', '#307C8A', '#28595B'],
  ['#DCE5FA', '#C5D8F4', '#97B5E7', '#7096CE', '#365BBC', '#24416E'],
  ['#E6DEF4', '#D8C8EE', '#C4AFE2', '#9572C4', '#7955A3', '#563B7E'],
  ['#F3D8DE', '#E9B9C6', '#DE9AA9', '#C5758D', '#BC6983', '#AE536C'],
  ['#F0F1F3', '#E7E7E7', '#BFC3C8', '#7B838E', '#657084', '#424A55'],
] as const;

// Same row order as the category palette, with cooler, muted shades. 
// The idea was not to confuse the user with the same colors for accounts and categories, but still have a visual connection between them.
export const ACCOUNT_ICON_COLOR_ROWS = [
  ['#E4D3D2', '#CFB1AF', '#BC928F', '#A76F6C', '#895552', '#69413F'],
  ['#E4DAD2', '#CFBDAF', '#BCA28F', '#A7856C', '#896952', '#69513F'],
  ['#E4DFD3', '#CFC6B0', '#BBAF90', '#A6966E', '#887953', '#685D40'],
  ['#D3E4D6', '#B1CEB6', '#91BA99', '#6FA579', '#54875E', '#416848'],
  ['#D3E3E4', '#B1CCCE', '#91B8BA', '#6FA2A5', '#548487', '#416668'],
  ['#D3D8E4', '#B0B9CF', '#909DBB', '#6E7EA6', '#536388', '#404C68'],
  ['#DCD3E3', '#C0B1CD', '#A792B9', '#8B70A4', '#6F5686', '#554267'],
  ['#E4D3DB', '#CFB0BF', '#BB90A6', '#A66E8A', '#88536E', '#684054'],
  ['#D9DADD', '#BBBDC3', '#A0A3AB', '#838691', '#676A74', '#4F5259'],
] as const;

export const DEFAULT_ACCOUNT_ICON_COLOR = ACCOUNT_ICON_COLOR_ROWS[5][4];
export const QUICK_ACCOUNT_ICON_COLORS = [
  DEFAULT_ACCOUNT_ICON_COLOR,
  ACCOUNT_ICON_COLOR_ROWS[3][4],
  ACCOUNT_ICON_COLOR_ROWS[0][4],
  ACCOUNT_ICON_COLOR_ROWS[6][4],
] as const;

const DEFAULT_CATEGORY_COLORS = {
  groceries: '#397B55',
  restaurants: '#6D9C4C',
  health: '#D97469',
  sports: '#4B9C9F',
  transport: '#365BBC',
  car: '#24416E',
  travel: '#7096CE',
  telecom: '#97B5E7',
  rent: '#E66F0E',
  utilities: '#D98222',
  household: '#F28C46',
  furniture: '#F6AF7D',
  repairs: '#B95312',
  appliances: '#FFD9BA',
  kitchenware: '#FFF0E2',
  cosmetics: '#DE9AA9',
  clothing: '#C5758D',
  gifts: '#BC6983',
  family: '#E9B9C6',
  pets: '#F3D8DE',
  charity: '#AE536C',
  entertainment: '#7955A3',
  hobbies: '#9572C4',
  videoGames: '#563B7E',
  subscriptions: '#C4AFE2',
  education: '#D8C8EE',
  electronics: '#307C8A',
  bankFees: '#657084',
  taxes: '#424A55',
  insurance: '#7B838E',
  otherExpense: '#BFC3C8',
  salary: '#8AB879',
  interest: '#335830',
  rentalIncome: '#F4B451',
  giftsIncome: '#F8C5BF',
  business: '#28595B',
  benefits: '#B6D6A2',
  otherIncome: '#E7E7E7',
} satisfies Record<DefaultCategoryKey, string>;

export function defaultCategoryIconColor(
  key: DefaultCategoryKey | null,
  income = false,
): string {
  return key === null
    ? (income ? '#397B55' : DEFAULT_ICON_COLOR)
    : DEFAULT_CATEGORY_COLORS[key];
}

export function isIconColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export function iconForeground(background: string): string {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(background.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05
    ? '#FFFFFF'
    : '#000000';
}
