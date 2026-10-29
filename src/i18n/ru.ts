import type { Messages } from './en';

export const ru: Messages = {
  home: 'Главная',

  expenses: 'Расходы',
  income: 'Доходы',

  previousMonth: 'Предыдущий месяц',
  nextMonth: 'Следующий месяц',

  totalExpenses: 'Всего расходов',
  totalIncome: 'Всего доходов',

  addExpense: 'Добавить расход',
  addIncome: 'Добавить доход',

  newExpense: 'Новый расход',
  newIncome: 'Новый доход',

  createEntryPlaceholder: 'Форма создания операции пока недоступна',

  editEntryPlaceholder: (id: string) =>
    `Операция ${id}. Форма редактирования пока недоступна`,

  openEntry: (title: string) =>
    `Открыть операцию: ${title}`,

  noEntries: 'За этот месяц операций нет',

  accounts: 'Счета',
  categories: 'Категории',

  allAccounts: 'Все счета',
  allCategories: 'Все категории',

  selectedAccounts: (count: number) =>
    `Счета · ${count}`,

  selectedCategories: (count: number) =>
    `Категории · ${count}`,

  resetFilters: 'Сбросить фильтры',
  closeFilter: 'Закрыть фильтр',

  cancel: 'Отмена',
  filterHint: 'Без отметок — показывать всё',
  apply: 'Применить',

  settings: 'Настройки',
  language: 'Язык',

  loading: 'Загрузка',
  noAccounts: 'Счетов пока нет',
  loadAccountsError: 'Не удалось загрузить счета',

  newAccount: 'Новый счёт',
  accountName: 'Название счёта',
  description: 'Описание',
  openingBalance: 'Начальный остаток',
  currency: 'Валюта',
  accountIcon: 'Иконка счёта',
  cashIcon: 'Наличные',
  cardIcon: 'Карта',
  save: 'Сохранить',
  saving: 'Сохранение',
  error: 'Ошибка',
  accountNameRequired: 'Введите название счёта',
  invalidAmount: 'Введите корректную сумму, не более двух знаков после запятой',
  saveAccountError: 'Не удалось сохранить счёт',

  editAccount: 'Редактирование счёта',

  activeAccounts: 'Активные',
  archivedAccounts: 'Архивные',
  noArchivedAccounts: 'Архивных счетов нет',
  archiveAccount: 'Архивировать счёт',
  restoreAccount: 'Восстановить счёт',
  deleteAccount: 'Удалить счёт',
  deleteAccountConfirmation: (name: string) =>
    `Удалить счёт «${name}» без возможности восстановления?`,
  accountActionError: 'Не удалось выполнить действие',

  noCategories: 'Категорий пока нет',
  loadCategoriesError: 'Не удалось загрузить категории',

  newCategory: 'Новая категория',
  categoryName: 'Название категории',
  categoryNameRequired: 'Введите название категории',
  saveCategoryError: 'Не удалось сохранить категорию',
};