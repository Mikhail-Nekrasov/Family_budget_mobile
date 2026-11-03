import type { Messages } from './en';

export const fi: Messages = {
  home: 'Etusivu',

  expenses: 'Menot',
  income: 'Tulot',

  previousMonth: 'Edellinen kuukausi',
  nextMonth: 'Seuraava kuukausi',

  totalExpenses: 'Menot yhteensä',
  totalIncome: 'Tulot yhteensä',

  addExpense: 'Lisää meno',
  addIncome: 'Lisää tulo',

  newExpense: 'Uusi meno',
  newIncome: 'Uusi tulo',

  createEntryPlaceholder: 'Tapahtuman luontilomake ei ole vielä käytettävissä',

  editEntryPlaceholder: (id: string) =>
    `Tapahtuma ${id}. Muokkauslomake ei ole vielä käytettävissä`,

  openEntry: (title: string) =>
    `Avaa tapahtuma: ${title}`,

  noEntries: 'Ei tapahtumia tässä kuussa',

  accounts: 'Tilit',
  categories: 'Luokat',

  allAccounts: 'Kaikki tilit',
  allCategories: 'Kaikki luokat',

  selectedAccounts: (count: number) =>
    `Tilit · ${count}`,

  selectedCategories: (count: number) =>
    `Luokat · ${count}`,

  resetFilters: 'Tyhjennä suodattimet',
  closeFilter: 'Sulje suodatin',

  cancel: 'Peruuta',
  filterHint: 'Jos mitään ei ole valittu, näytetään kaikki',
  apply: 'Käytä',

  settings: 'Asetukset',
  language: 'Kieli',

  loading: 'Ladataan',
  noAccounts: 'Ei vielä tilejä',
  loadAccountsError: 'Tilien lataaminen epäonnistui',

  newAccount: 'Uusi tili',
  accountName: 'Tilin nimi',
  description: 'Kuvaus',
  openingBalance: 'Alkusaldo',
  currency: 'Valuutta',
  accountIcon: 'Tilin kuvake',
  cashIcon: 'Käteinen',
  cardIcon: 'Kortti',
  save: 'Tallenna',
  saving: 'Tallennetaan',
  error: 'Virhe',
  accountNameRequired: 'Anna tilin nimi',
  invalidAmount: 'Anna kelvollinen summa valitussa valuutassa',
  saveAccountError: 'Tilin tallentaminen epäonnistui',

  editAccount: 'Muokkaa tiliä',

  activeAccounts: 'Aktiiviset',
  archivedAccounts: 'Arkistoidut',
  noArchivedAccounts: 'Ei arkistoituja tilejä',
  archiveAccount: 'Arkistoi tili',
  restoreAccount: 'Palauta tili',
  deleteAccount: 'Poista tili',
  deleteAccountConfirmation: (name: string) =>
    `Poistetaanko tili "${name}" pysyvästi?`,
  accountActionError: 'Toimintoa ei voitu suorittaa',

  noCategories: 'Ei kategorioita',
  loadCategoriesError: 'Kategorioiden lataaminen epäonnistui',

  newCategory: 'Uusi kategoria',
  categoryName: 'Kategorian nimi',
  categoryNameRequired: 'Anna kategorian nimi',
  saveCategoryError: 'Kategorian tallentaminen epäonnistui',

  saveAccountOrderError: 'Tilien järjestyksen tallentaminen epäonnistui',

  entryTitle: 'Nimi',
  entryAmount: 'Summa',
  entryAccount: 'Tili',
  entryCategory: 'Luokka',
  entryTitleRequired: 'Anna nimi',
  entryAmountInvalid: 'Anna positiivinen summa tilin valuutassa',
  entryOptionsError: 'Tilejä ja luokkia ei voitu ladata',
  entryOptionsRequired: 'Luo ensin aktiivinen tili ja luokka',
  saveEntryError: 'Tapahtumaa ei voitu tallentaa',

  categoryIcon: 'Luokan kuvake',
  categoryIcons: {
    category: 'Yleinen',
    groceries: 'Ruokaostokset',
    housing: 'Asuminen',
    transport: 'Liikenne',
    food: 'Ruoka',
    salary: 'Työ',
    leisure: 'Vapaa-aika',
    health: 'Terveys',
  },
  
  showAllOptions: 'Näytä kaikki',

  select: 'Valitse',

  entryCategoryRequired: 'Valitse luokka',

  selectAccount: 'Valitse tili',

  entryDate: 'Päivä',
  entryTime: 'Aika',

  today: 'Tänään',
  now: 'Nyt',

  ok: 'OK',

  loadEntriesError: 'Tapahtumia ei voitu ladata',
  chartMixedCurrencies: 'Valitse kaaviota varten tilit, joilla on sama valuutta',

  primaryCurrency: 'Päävaluutta',
  loadPreferencesError: 'Asetuksia ei voitu ladata',
  savePreferencesError: 'Asetuksia ei voitu tallentaa',

  conversionUnavailable: 'Yhteissumman laskemiseen tarvitaan valuuttakurssit',
};