export const syncPageText = {
  en: {
    title: 'Synchronization', alertTitle: 'Choose which changes to keep',
    alertBody: 'Some data changed both on this device and on the server.',
    resolve: 'Resolve', later: 'Later', count: 'Conflicts to resolve',
    clear: 'No conflicts need a decision',
  },
  ru: {
    title: 'Синхронизация', alertTitle: 'Нужно выбрать версию',
    alertBody: 'Некоторые данные изменились и на этом устройстве, и на сервере.',
    resolve: 'Решить', later: 'Позже', count: 'Требуют решения',
    clear: 'Нет конфликтов, требующих решения',
  },
  fi: {
    title: 'Synkronointi', alertTitle: 'Valitse säilytettävät muutokset',
    alertBody: 'Osa tiedoista muuttui sekä tällä laitteella että palvelimella.',
    resolve: 'Ratkaise', later: 'Myöhemmin', count: 'Ratkaistavia ristiriitoja',
    clear: 'Ratkaistavia ristiriitoja ei ole',
  },
} as const;
