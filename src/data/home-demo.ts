export type EntryType = 'EXPENSE' | 'INCOME';

export const accounts = {
  cash: {
    name: 'Cash',
    balanceCents: 25000,
    iconKey: 'cash',
    currencyCode: 'EUR',
    currencySymbol: '€',
  },
  card: {
    name: 'Bank card',
    balanceCents: 120000,
    iconKey: 'card',
    currencyCode: 'EUR',
    currencySymbol: '€',
  },
} as const;

export const categories = {
  groceries: {
    name: 'Groceries',
    color: '#EF9F45',
  },
  housing: {
    name: 'Housing',
    color: '#8171CF',
  },
  transport: {
    name: 'Transport',
    color: '#4B9FBA',
  },
  salary: {
    name: 'Salary',
    color: '#469D83',
  },
  otherIncome: {
    name: 'Other income',
    color: '#86BA63',
  },
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
    title: 'Grocery shopping',
    type: 'EXPENSE',
    amountCents: 4250,
    accountId: 'card',
    categoryId: 'groceries',
    month: currentMonth,
  },
  {
    id: '2',
    title: 'Travel pass',
    type: 'EXPENSE',
    amountCents: 7200,
    accountId: 'card',
    categoryId: 'transport',
    month: currentMonth,
  },
  {
    id: '3',
    title: 'Rent',
    type: 'EXPENSE',
    amountCents: 85000,
    accountId: 'card',
    categoryId: 'housing',
    month: currentMonth,
  },
  {
    id: '4',
    title: 'Fruit and vegetables',
    type: 'EXPENSE',
    amountCents: 1875,
    accountId: 'cash',
    categoryId: 'groceries',
    month: currentMonth,
  },
  {
    id: '5',
    title: 'Bus ticket',
    type: 'EXPENSE',
    amountCents: 320,
    accountId: 'cash',
    categoryId: 'transport',
    month: currentMonth,
  },
  {
    id: '6',
    title: 'Salary',
    type: 'INCOME',
    amountCents: 250000,
    accountId: 'card',
    categoryId: 'salary',
    month: currentMonth,
  },
  {
    id: '7',
    title: 'Selling items',
    type: 'INCOME',
    amountCents: 6500,
    accountId: 'cash',
    categoryId: 'otherIncome',
    month: currentMonth,
  },
];

export function formatAmount(
  cents: number,
  locale: string,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}