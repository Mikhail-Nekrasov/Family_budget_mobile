import type { EntryType } from '@/models/entry-type';

export const DEFAULT_CATEGORIES = [
  { key: 'groceries', type: 'EXPENSE', iconKey: 'groceries', sortOrder: 0 },
  { key: 'transport', type: 'EXPENSE', iconKey: 'transport', sortOrder: 1 },
  { key: 'clothing', type: 'EXPENSE', iconKey: 'clothing', sortOrder: 2 },
  { key: 'rent', type: 'EXPENSE', iconKey: 'housing', sortOrder: 3 },
  { key: 'utilities', type: 'EXPENSE', iconKey: 'utilities', sortOrder: 4 },
  { key: 'restaurants', type: 'EXPENSE', iconKey: 'food', sortOrder: 5 },
  { key: 'gifts', type: 'EXPENSE', iconKey: 'gift', sortOrder: 6 },
  { key: 'telecom', type: 'EXPENSE', iconKey: 'telecom', sortOrder: 7 },
  { key: 'bankFees', type: 'EXPENSE', iconKey: 'bank', sortOrder: 8 },
  { key: 'subscriptions', type: 'EXPENSE', iconKey: 'subscriptions', sortOrder: 9 },
  { key: 'household', type: 'EXPENSE', iconKey: 'household', sortOrder: 10 },
  { key: 'cosmetics', type: 'EXPENSE', iconKey: 'cosmetics', sortOrder: 11 },
  { key: 'health', type: 'EXPENSE', iconKey: 'health', sortOrder: 12 },
  { key: 'sports', type: 'EXPENSE', iconKey: 'sports', sortOrder: 13 },
  { key: 'taxes', type: 'EXPENSE', iconKey: 'tax', sortOrder: 14 },
  { key: 'insurance', type: 'EXPENSE', iconKey: 'insurance', sortOrder: 15 },
  { key: 'car', type: 'EXPENSE', iconKey: 'car', sortOrder: 16 },
  { key: 'entertainment', type: 'EXPENSE', iconKey: 'leisure', sortOrder: 17 },
  { key: 'hobbies', type: 'EXPENSE', iconKey: 'hobbies', sortOrder: 18 },
  { key: 'kitchenware', type: 'EXPENSE', iconKey: 'kitchenware', sortOrder: 19 },
  { key: 'furniture', type: 'EXPENSE', iconKey: 'furniture', sortOrder: 20 },
  { key: 'education', type: 'EXPENSE', iconKey: 'education', sortOrder: 21 },
  { key: 'electronics', type: 'EXPENSE', iconKey: 'electronics', sortOrder: 22 },
  { key: 'appliances', type: 'EXPENSE', iconKey: 'appliances', sortOrder: 23 },
  { key: 'family', type: 'EXPENSE', iconKey: 'family', sortOrder: 24 },
  { key: 'videoGames', type: 'EXPENSE', iconKey: 'games', sortOrder: 25 },
  { key: 'travel', type: 'EXPENSE', iconKey: 'travel', sortOrder: 26 },
  { key: 'pets', type: 'EXPENSE', iconKey: 'pets', sortOrder: 27 },
  { key: 'repairs', type: 'EXPENSE', iconKey: 'repairs', sortOrder: 28 },
  { key: 'charity', type: 'EXPENSE', iconKey: 'charity', sortOrder: 29 },
  { key: 'otherExpense', type: 'EXPENSE', iconKey: 'otherExpense', sortOrder: 30 },
  { key: 'salary', type: 'INCOME', iconKey: 'salary', sortOrder: 0 },
  { key: 'interest', type: 'INCOME', iconKey: 'interest', sortOrder: 1 },
  { key: 'rentalIncome', type: 'INCOME', iconKey: 'rentalIncome', sortOrder: 2 },
  { key: 'giftsIncome', type: 'INCOME', iconKey: 'giftsIncome', sortOrder: 3 },
  { key: 'business', type: 'INCOME', iconKey: 'business', sortOrder: 4 },
  { key: 'benefits', type: 'INCOME', iconKey: 'benefits', sortOrder: 5 },
  { key: 'otherIncome', type: 'INCOME', iconKey: 'otherIncome', sortOrder: 6 },
] as const satisfies readonly {
  key: string;
  type: EntryType;
  iconKey: string;
  sortOrder: number;
}[];

export type DefaultCategoryKey = typeof DEFAULT_CATEGORIES[number]['key'];
