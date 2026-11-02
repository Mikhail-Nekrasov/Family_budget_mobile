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

  loading: 'Loading',
  noAccounts: 'No accounts yet',
  loadAccountsError: 'Could not load accounts',

  newAccount: 'New account',
  accountName: 'Account name',
  description: 'Description',
  openingBalance: 'Opening balance',
  currency: 'Currency',
  accountIcon: 'Account icon',
  cashIcon: 'Cash',
  cardIcon: 'Card',
  save: 'Save',
  saving: 'Saving',
  error: 'Error',
  accountNameRequired: 'Enter an account name',
  invalidAmount: 'Enter a valid amount with up to two decimal places',
  saveAccountError: 'Could not save the account',

  editAccount: 'Edit account',

  activeAccounts: 'Active',
  archivedAccounts: 'Archived',
  noArchivedAccounts: 'No archived accounts',
  archiveAccount: 'Archive account',
  restoreAccount: 'Restore account',
  deleteAccount: 'Delete account',
  deleteAccountConfirmation: (name: string) =>
    `Permanently delete "${name}"?`,
  accountActionError: 'Could not complete the action',

  noCategories: 'No categories',
  loadCategoriesError: 'Could not load categories',

  newCategory: 'New category',
  categoryName: 'Category name',
  categoryNameRequired: 'Enter a category name',
  saveCategoryError: 'Could not save category',

  saveAccountOrderError: 'Could not save account order',

  entryTitle: 'Title',
  entryAmount: 'Amount',
  entryAccount: 'Account',
  entryCategory: 'Category',
  entryTitleRequired: 'Enter a title of up to 255 characters',
  entryAmountInvalid: 'Enter a positive amount in the account currency',
  entryOptionsError: 'Could not load accounts and categories',
  entryOptionsRequired: 'Create an active account and a category first',
  saveEntryError: 'Could not save the entry',

  categoryIcon: 'Category icon',
  categoryIcons: {
    category: 'General',
    groceries: 'Groceries',
    housing: 'Housing',
    transport: 'Transport',
    food: 'Food',
    salary: 'Work',
    leisure: 'Leisure',
    health: 'Health',
  },
  
  showAllOptions: 'Show all',

  select: 'Select',

  entryCategoryRequired: 'Select a category',

  selectAccount: 'Select an account',

  entryDate: 'Date',
  entryTime: 'Time',
};

export type Messages = typeof en;