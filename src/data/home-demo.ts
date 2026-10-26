export type EntryType = 'EXPENSE' | 'INCOME';

export const accounts = {
  cash: {
    name: 'Наличные',
    iconKey: 'cash',
    currencyCode: 'EUR',
    currencySymbol: '€',
  },
  card: {
    name: 'Банковская карта',
    iconKey: 'card',
    currencyCode: 'EUR',
    currencySymbol: '€',
  },
} as const;

export const categories = {
  groceries: { name: 'Продукты', color: '#EF9F45' },
  housing: { name: 'Жильё', color: '#8171CF' },
  transport: { name: 'Транспорт', color: '#4B9FBA' },
  salary: { name: 'Зарплата', color: '#469D83' },
  otherIncome: { name: 'Другие доходы', color: '#86BA63' },
} as const;

type DemoEntry = {
  id: string;
  title: string;
  type: EntryType;
  amountCents: number;
  accountId: keyof typeof accounts;
  categoryId: keyof typeof categories;
  month: string;
};

const now = new Date();

const currentMonth =
  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

export const demoEntries: DemoEntry[] = [
  {
    id: '1',
    title: 'Покупка продуктов',
    type: 'EXPENSE',
    amountCents: 4250,
    accountId: 'card',
    categoryId: 'groceries',
    month: currentMonth,
  },
  {
    id: '2',
    title: 'Проездной',
    type: 'EXPENSE',
    amountCents: 7200,
    accountId: 'card',
    categoryId: 'transport',
    month: currentMonth,
  },
  {
    id: '3',
    title: 'Аренда квартиры',
    type: 'EXPENSE',
    amountCents: 85000,
    accountId: 'card',
    categoryId: 'housing',
    month: currentMonth,
  },
  {
    id: '4',
    title: 'Овощи и фрукты',
    type: 'EXPENSE',
    amountCents: 1875,
    accountId: 'cash',
    categoryId: 'groceries',
    month: currentMonth,
  },
  {
    id: '5',
    title: 'Поездка на автобусе',
    type: 'EXPENSE',
    amountCents: 320,
    accountId: 'cash',
    categoryId: 'transport',
    month: currentMonth,
  },
  {
    id: '6',
    title: 'Зарплата',
    type: 'INCOME',
    amountCents: 250000,
    accountId: 'card',
    categoryId: 'salary',
    month: currentMonth,
  },
  {
    id: '7',
    title: 'Продажа вещей',
    type: 'INCOME',
    amountCents: 6500,
    accountId: 'cash',
    categoryId: 'otherIncome',
    month: currentMonth,
  },
];

export function formatAmount(cents: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}