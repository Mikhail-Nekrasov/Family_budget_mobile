import type { Messages } from './en';

export const ru: Messages = {
  editCategory: "Редактировать категорию",
  deleteCategory: "Удалить категорию",
  deleteCategoryError: "Не удалось удалить категорию",
  categoryInUse: "Категория используется в операциях и не может быть удалена",
  categoryDeleteConfirmation: "Удалить эту неиспользуемую категорию без возможности восстановления?",
  categoryRenameWarning: "Новое название будет показано и у прежних операций этой категории. Группировка и фильтры по названию могут измениться. Операции и суммы сохранятся",
  categoryRenameLocalizedWarning: "Новое название будет показано и у прежних операций этой категории, только на текущем языке. Названия на других языках не изменятся. Группировка и фильтры по названию могут измениться",
  categoryRenameConfirm: "Переименовать",
  categoryLocalNameHint: "Это название применяется только на текущем языке",
  categoryCustomNameHint: "Это название показывается на всех языках",

  defaultCategories: {
    groceries: "Продукты",
    transport: "Транспорт",
    clothing: "Одежда",
    rent: "Аренда",
    utilities: "Коммуналка",
    restaurants: "Рестораны",
    gifts: "Подарки",
    telecom: "Связь",
    bankFees: "Комиссии",
    subscriptions: "Подписки",
    household: "Хозтовары",
    cosmetics: "Косметика",
    health: "Здоровье",
    sports: "Спорт",
    taxes: "Налоги",
    insurance: "Страховка",
    car: "Авто",
    entertainment: "Развлечения",
    hobbies: "Хобби",
    kitchenware: "Посуда",
    furniture: "Мебель",
    education: "Образование",
    electronics: "Электроника",
    appliances: "Бытовая техника",
    family: "Семья",
    videoGames: "Видеоигры",
    travel: "Путешествия",
    pets: "Питомцы",
    repairs: "Ремонт",
    charity: "Благотворительность",
    otherExpense: "Другое",
    salary: "Зарплата",
    interest: "Проценты",
    rentalIncome: "Сдача в аренду",
    giftsIncome: "Подарки",
    business: "Бизнес",
    benefits: "Пособия",
    otherIncome: "Другое",
  },

  exchangeRates: 'Курсы валют',
  ratesCurrent: 'Текущие',
  ratesHistorical: 'Исторические',
  ratesBaseCurrency: 'Базовая валюта',
  ratesRefresh: 'Обновить',
  ratesQuoteDate: 'Дата курса',
  ratesFetchedAt: 'Получено',
  ratesUnavailable: 'Курс недоступен',
  ratesOffline: 'Нет интернета · показаны сохранённые курсы',
  ratesLoadError: 'Не удалось обновить курсы · показаны сохранённые данные, если они есть',
  ratesMissing: 'Некоторых курсов нет · подключитесь к интернету и нажмите «Обновить»',

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
  invalidAmount: 'Введите корректную сумму в выбранной валюте',
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

  saveAccountOrderError: 'Не удалось сохранить порядок счетов',

  entryTitle: 'Название',
  entryAmount: 'Сумма',
  entryAccount: 'Счёт',
  entryCategory: 'Категория',
  entryTitleRequired: 'Введите название',
  entryAmountInvalid: 'Введите положительную сумму в валюте счёта',
  entryOptionsError: 'Не удалось загрузить счета и категории',
  entryOptionsRequired: 'Сначала создайте активный счёт и категорию',
  saveEntryError: 'Не удалось сохранить операцию',

  categoryIcon: 'Иконка категории',
  categoryIcons: {
    category: 'Общее',
    groceries: 'Продукты',
    housing: 'Жильё',
    transport: 'Транспорт',
    food: 'Еда',
    salary: 'Работа',
    leisure: 'Досуг',
    health: 'Здоровье',
    clothing: "Одежда",
    utilities: "Коммуналка",
    gift: "Подарки",
    telecom: "Связь",
    bank: "Комиссии",
    subscriptions: "Подписки",
    household: "Хозтовары",
    cosmetics: "Косметика",
    sports: "Спорт",
    tax: "Налоги",
    insurance: "Страховка",
    car: "Авто",
    hobbies: "Хобби",
    kitchenware: "Посуда",
    furniture: "Мебель",
    education: "Образование",
    electronics: "Электроника",
    appliances: "Бытовая техника",
    family: "Семья",
    games: "Видеоигры",
    travel: "Путешествия",
    pets: "Питомцы",
    repairs: "Ремонт",
    charity: "Благотворительность",
    interest: "Проценты",
    business: "Бизнес",
    benefits: "Пособия",
  },

  showAllOptions: 'Показать все',

  select: 'Выбрать',

  entryCategoryRequired: 'Выберите категорию',

  selectAccount: 'Выберите счёт',

  entryDate: 'Дата',
  entryTime: 'Время',

  today: 'Сегодня',
  now: 'Сейчас',

  ok: 'ОК',

  loadEntriesError: 'Не удалось загрузить операции',
  chartMixedCurrencies: 'Для диаграммы выберите счета в одной валюте',

  primaryCurrency: 'Основная валюта',
  loadPreferencesError: 'Не удалось загрузить настройки',
  savePreferencesError: 'Не удалось сохранить настройки',

  conversionUnavailable: 'Для расчёта итога нужны курсы валют',

  editExpense: 'Редактирование расхода',
  editIncome: 'Редактирование дохода',
  deleteEntry: 'Удалить операцию',
  deleteEntryError: 'Не удалось удалить операцию',
  deleteEntryConfirmation: (title: string) =>
    `Удалить операцию «${title}» без возможности восстановления?`,

  currencyWholeAmountRequired: 'В этой валюте сумма должна быть целым числом',
};