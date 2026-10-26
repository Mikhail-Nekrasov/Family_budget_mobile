export const en = {
  home: 'Home',

  expenses: 'Expenses',
  income: 'Income',

  previousMonth: 'Previous month',
  nextMonth: 'Next month',

  totalExpenses: 'Total expenses',
  totalIncome: 'Total income',

  addExpense: 'Add expense',
  addIncome: 'Add income',

  newExpense: 'New expense',
  newIncome: 'New income',

  createEntryPlaceholder: 'The entry form is not available yet',

  editEntryPlaceholder: (id: string) =>
    `Entry ${id}. The editing form is not available yet`,

  openEntry: (title: string) =>
    `Open entry: ${title}`,

  noEntries: 'No entries for this month',

  accounts: 'Accounts',
  categories: 'Categories',

  allAccounts: 'All accounts',
  allCategories: 'All categories',

  selectedAccounts: (count: number) =>
    `Accounts · ${count}`,

  selectedCategories: (count: number) =>
    `Categories · ${count}`,

  resetFilters: 'Reset filters',
  closeFilter: 'Close filter',

  cancel: 'Cancel',
  filterHint: 'Leave all unchecked to show everything',
  apply: 'Apply',

  settings: 'Settings',
  language: 'Language',
};

export type Messages = typeof en;