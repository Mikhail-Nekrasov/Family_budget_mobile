import {
  CURRENCY_CODES,
  CURRENCY_SYMBOLS,
} from '@/constants/currencies';

export const ACCOUNT_ICON_PATHS = {
  cash: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M5 8h1 M18 16h1',

  card: 'M4 5h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z M2 10h20 M6 15h4',

  bank: 'm3 9 9-6 9 6H3Z M5 10v8 M10 10v8 M14 10v8 M19 10v8 M3 21h18',

  wallet: 'M20 7H5a2 2 0 0 1 0-4h13v4 M4 7v12a2 2 0 0 0 2 2h14V7 M20 11h-5v6h5 M17 14h.1',

  purse: 'M3 6h18v14H3V6Z M3 6l3-3h12l3 3 M12 6v14 M15 12h3v3h-3Z',

  piggyBank: 'M5 10c0-4 5-6 10-4l3-3v5l3 2v5h-3l-1 5h-3l-1-3H9l-1 3H5l-1-6c-3 0-3-4-1-4h2Z M9 6h4 M16 10h.1',

  safe: 'M4 2h16v19H4V2Z M7 21v1 M17 21v1 M16 11a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z M12 7v8 M8 11h8 M18 6v2',

  coins: 'M3 6c0-3 12-3 12 0s-12 3-12 0Z M3 6v4c0 3 12 3 12 0V6 M3 10v4c0 2 6 3 10 1 M14 12c0-3 8-3 8 0s-8 3-8 0Z M14 12v7c0 3 8 3 8 0v-7',

  business: 'M8 7V3h8v4 M3 7h18v14H3V7Z M3 12c6 4 12 4 18 0 M10 13h4v3h-4Z',

  moneyBag: 'm8 3 4 2 4-2-2 5c10 10 8 14-2 14S0 18 10 8L8 3Z M9 9h6 M9 18l6-6 M10 12h.1 M14 18h.1',

  investment: 'M3 20V14h4v6H3Z M10 20V9h4v11h-4Z M17 20V4h4v16h-4Z',

  diamond: 'M3 8 7 3h10l4 5-9 13L3 8Z M3 8h18 M7 3l5 18 5-18 M7 8l5-5 5 5',

  gold: 'M2.5 19.5 5 12h10.5l2.5 7.5H2.5Z M5 12l4-5h9.5l-3 5 M18.5 7l3.5 8-4 4.5',

  mobileCard: 'M15 10V4a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1 M7 5h4 M7 19h2 M10 10h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2Z M8 13h14 M11 16h3',

  bitcoin: 'M9 5v14 M7 5h7c5 0 5 7 0 7H9 M14 12c6 0 6 7 0 7H7 M11 2v3 M15 2v3 M11 19v3 M15 19v3',
} as const;

export type AccountIconKey =
  keyof typeof ACCOUNT_ICON_PATHS;

export const ACCOUNT_ICON_KEYS =
  Object.keys(ACCOUNT_ICON_PATHS) as AccountIconKey[];

export const ACCOUNT_CURRENCY_SYMBOLS = [
  ...new Set(
    CURRENCY_CODES.map((code) => CURRENCY_SYMBOLS[code]),
  ),
];