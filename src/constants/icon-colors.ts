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

// Keep the same color families as the category palette, with separate swatches.
// Each family steps down in perceptual lightness.
export const ACCOUNT_ICON_COLOR_ROWS = [
  ['#FEC9C1', '#FD9C90', '#F97163', '#E25146', '#BF3F35', '#992B24'],
  ['#FECCA8', '#F9A462', '#EA8324', '#CC6C01', '#A95A07', '#844505'],
  ['#F2D48E', '#DDB54C', '#C69B12', '#A98309', '#8D6D00', '#6E5401'],
  ['#ADE9B4', '#7DD18A', '#4EBC65', '#1EA447', '#078936', '#056B29'],
  ['#8EEBE2', '#3DD4C9', '#06BAB0', '#129D95', '#06837C', '#056660'],
  ['#BBDBFE', '#86BFFD', '#4EA6FD', '#078BF1', '#0C73C8', '#00599F'],
  ['#D9D0FE', '#BEACFD', '#A88AFD', '#926DEB', '#7958C7', '#5F42A1'],
  ['#FEC2ED', '#F098D9', '#E075C6', '#C858AF', '#A94593', '#873174'],
  ['#CDD9E7', '#ADBCCF', '#91A4B9', '#778BA2', '#627387', '#4B5A6B'],
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
