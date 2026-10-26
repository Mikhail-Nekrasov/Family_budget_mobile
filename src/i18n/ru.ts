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
};