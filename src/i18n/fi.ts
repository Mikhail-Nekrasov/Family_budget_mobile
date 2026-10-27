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
  invalidAmount: 'Anna kelvollinen summa, jossa on enintään kaksi desimaalia',
  saveAccountError: 'Tilin tallentaminen epäonnistui',

  editAccount: 'Muokkaa tiliä',
};