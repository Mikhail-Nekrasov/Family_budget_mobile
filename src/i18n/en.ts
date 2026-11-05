export const en = {
  editCategory: "Edit category",
  deleteCategory: "Delete category",
  deleteCategoryError: "Could not delete the category",
  categoryInUse: "This category is used by operations and cannot be deleted",
  categoryDeleteConfirmation: "Permanently delete this unused category?",
  categoryRenameWarning: "The new name will also appear on previous operations in this category. Name-based grouping and filters may change. Operations and amounts will stay unchanged",
  categoryRenameLocalizedWarning: "The new name will also appear on previous operations in this category, only in the current language. Names in other languages will stay unchanged. Name-based grouping and filters may change",
  categoryRenameConfirm: "Rename",
  categoryLocalNameHint: "This name applies only to the current language",
  categoryCustomNameHint: "This name is shown in every language",

  defaultCategories: {
    groceries: "Groceries",
    transport: "Transport",
    clothing: "Clothing",
    rent: "Rent",
    utilities: "Utilities",
    restaurants: "Restaurants",
    gifts: "Gifts",
    telecom: "Telecom",
    bankFees: "Bank fees",
    subscriptions: "Subscriptions",
    household: "Household",
    cosmetics: "Cosmetics",
    health: "Health",
    sports: "Sports",
    taxes: "Taxes",
    insurance: "Insurance",
    car: "Car",
    entertainment: "Entertainment",
    hobbies: "Hobbies",
    kitchenware: "Kitchenware",
    furniture: "Furniture",
    education: "Education",
    electronics: "Electronics",
    appliances: "Appliances",
    family: "Family",
    videoGames: "Video games",
    travel: "Travel",
    pets: "Pets",
    repairs: "Repairs",
    charity: "Charity",
    otherExpense: "Other",
    salary: "Salary",
    interest: "Interest",
    rentalIncome: "Rental income",
    giftsIncome: "Gifts",
    business: "Self-employment",
    benefits: "Benefits",
    otherIncome: "Other",
  },

  exchangeRates: 'Exchange rates',
  ratesCurrent: 'Current',
  ratesHistorical: 'Historical',
  ratesBaseCurrency: 'Base currency',
  ratesRefresh: 'Refresh',
  ratesQuoteDate: 'Rate date',
  ratesFetchedAt: 'Retrieved',
  ratesUnavailable: 'Rate unavailable',
  ratesOffline: 'Offline · showing saved rates',
  ratesLoadError: 'Could not refresh rates · saved rates are shown where available',
  ratesMissing: 'Some rates are missing · connect to the internet and refresh',

  periodTitle: "Period",
  periodMonth: "Month",
  periodYear: "Year",
  periodAllTime: "All time",
  periodCustom: "Custom range",
  periodFrom: "From",
  periodThrough: "To",
  periodShow: "Show",
  periodExpensesFor: "Show expenses for",
  periodIncomeFor: "Show income for",
  periodInvalidRange: "Choose an end date on or after the start date",
  periodPrevious: "Previous period",
  periodNext: "Next period",
  noEntriesInPeriod: "No entries for this period",

  periodFutureNotAllowed: "Choose a date no later than today",

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
  invalidAmount: 'Enter a valid amount in the selected currency',
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
  entryTitleRequired: 'Enter a title',
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
    clothing: "Clothing",
    utilities: "Utilities",
    gift: "Gifts",
    telecom: "Telecom",
    bank: "Bank fees",
    subscriptions: "Subscriptions",
    household: "Household",
    cosmetics: "Cosmetics",
    sports: "Sports",
    tax: "Taxes",
    insurance: "Insurance",
    car: "Car",
    hobbies: "Hobbies",
    kitchenware: "Kitchenware",
    furniture: "Furniture",
    education: "Education",
    electronics: "Electronics",
    appliances: "Appliances",
    family: "Family",
    games: "Video games",
    travel: "Travel",
    pets: "Pets",
    repairs: "Repairs",
    charity: "Charity",
    interest: "Interest",
    business: "Self-employment",
    benefits: "Benefits",
  },
  
  showAllOptions: 'Show all',

  select: 'Select',

  entryCategoryRequired: 'Select a category',

  selectAccount: 'Select an account',

  entryDate: 'Date',
  entryTime: 'Time',

  today: 'Today',
  now: 'Now',

  ok: 'OK',

  loadEntriesError: 'Could not load entries',
  chartMixedCurrencies: 'Select accounts with the same currency to view the chart',

  primaryCurrency: 'Primary currency',
  loadPreferencesError: 'Could not load settings',
  savePreferencesError: 'Could not save settings',

  conversionUnavailable: 'Exchange rates are required to calculate the total',

  editExpense: 'Edit expense',
  editIncome: 'Edit income',
  deleteEntry: 'Delete entry',
  deleteEntryError: 'Could not delete the entry',
  deleteEntryConfirmation: (title: string) =>
    `Permanently delete "${title}"?`,
  
  currencyWholeAmountRequired: 'This currency does not allow decimal amounts',
};

export type Messages = typeof en;