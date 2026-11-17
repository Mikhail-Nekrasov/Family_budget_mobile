import { conflictDate } from '@/utils/conflict-date';
import { Text, View } from 'react-native';

import { ConflictComparison } from '@/components/conflict-comparison';
import type { Language } from '@/i18n/languages';
import { mergeEntryVersions, type EntryConflictVersion, type EntrySyncConflict } from '@/services/entry-sync-conflict';
import { currencyFractionDigits } from '@/utils/money';

const labels = {
  en: {
    local: 'On this device', server: 'On the server', unknown: 'Unknown editor', changed: 'Changed',
    missingBase: 'The original version is unavailable. Differences are shown without assigning them to either edit.',
    keepLocal: 'Apply my version', keepServer: 'Keep server version',
    deleted: 'Deleted on this device', remoteDeleted: 'Deleted on the server', copy: 'Create a new entry from my version', keepDeletion: 'Keep deletion', restore: 'Restore server version',
    failed: 'Could not resolve this conflict. Local changes are saved.',
    title: 'Title', amountMinor: 'Amount', dateTime: 'Date', description: 'Note', accountSyncId: 'Account', categorySyncId: 'Category',
  },
  ru: {
    local: 'На этом устройстве', server: 'На сервере', unknown: 'Автор неизвестен', changed: 'Изменено',
    missingBase: 'Исходная версия недоступна. Показаны различия между версиями.',
    keepLocal: 'Применить мою версию', keepServer: 'Оставить версию сервера',
    deleted: 'Удалено на этом устройстве', remoteDeleted: 'Удалено на сервере', copy: 'Создать запись из моей версии', keepDeletion: 'Подтвердить удаление', restore: 'Восстановить версию сервера',
    failed: 'Не удалось разрешить конфликт. Локальные изменения сохранены.',
    title: 'Название', amountMinor: 'Сумма', dateTime: 'Дата', description: 'Примечание', accountSyncId: 'Счёт', categorySyncId: 'Категория',
  },
  fi: {
    local: 'Tällä laitteella', server: 'Palvelimella', unknown: 'Tuntematon muokkaaja', changed: 'Muokattu',
    missingBase: 'Alkuperäistä versiota ei ole saatavilla. Versioiden erot näytetään.',
    keepLocal: 'Käytä omaa versiota', keepServer: 'Säilytä palvelimen versio',
    deleted: 'Poistettu tällä laitteella', remoteDeleted: 'Poistettu palvelimelta', copy: 'Luo uusi tapahtuma omasta versiosta', keepDeletion: 'Vahvista poisto', restore: 'Palauta palvelimen versio',
    failed: 'Ristiriitaa ei voitu ratkaista. Paikalliset muutokset on tallennettu.',
    title: 'Otsikko', amountMinor: 'Summa', dateTime: 'Päivä', description: 'Huomautus', accountSyncId: 'Tili', categorySyncId: 'Luokka',
  },
};

const fields = ['title', 'amountMinor', 'dateTime', 'description', 'accountSyncId', 'categorySyncId'] as const;

function displayValue(
  value: EntryConflictVersion & { currencyCode?: string; accountName?: string; categoryName?: string },
  field: typeof fields[number],
  locale: string,
) {
  if (field === 'accountSyncId') return value.accountName ?? value.accountSyncId;
  if (field === 'categorySyncId') return value.categoryName ?? value.categorySyncId;
  if (field === 'amountMinor' && value.currencyCode) {
    return new Intl.NumberFormat(locale, { currency: value.currencyCode, style: 'currency' })
      .format(value.amountMinor / 10 ** currencyFractionDigits(value.currencyCode));
  }
  return value[field] ?? '—';
}

export function EntryConflictComparison({
  conflict, username, language, locale, color, onResolve,
}: {
  conflict: EntrySyncConflict;
  username: string;
  language: Language;
  locale: string;
  color: string;
  onResolve: (choice: 'server' | 'local') => Promise<void>;
}) {
  const text = labels[language];
  const { local, server, base, localDeleted } = conflict;
  const localPreview = mergeEntryVersions(conflict, 'local')?.merged;
  const serverPreview = mergeEntryVersions(conflict, 'server')?.merged;

  function enrich(value: EntryConflictVersion) {
    const account = value.accountSyncId === local.accountSyncId ? local : server;
    const category = value.categorySyncId === local.categorySyncId ? local : server;
    return { ...value, currencyCode: account?.currencyCode,
      accountName: account?.accountName, categoryName: category?.categoryName };
  }
  const left = localPreview ? enrich(localPreview) : local;
  const right = serverPreview ? enrich(serverPreview) : server;
  const different = fields.filter((field) => localDeleted || !right || left[field] !== right[field]);
  const dates = [...new Set([local.dateTime, server?.dateTime].filter(Boolean)
    .map((date) => conflictDate(date, locale)))].join(' / ');
  return (
    <View style={{ gap: 12 }}>
      <ConflictComparison language={language} color={color} title={`${local.type === 'EXPENSE'
          ? { en: 'Expense', ru: 'Расход', fi: 'Meno' }[language]
          : { en: 'Income', ru: 'Доход', fi: 'Tulo' }[language]} · ${local.title} · ${dates}`}
        localInfo={`${username}${localDeleted ? ` · ${text.deleted}` : ''}`}
        serverInfo={server ? server.editor ?? text.unknown : text.remoteDeleted}
        rows={different.map((field) => ({
          label: text[field],
          local: localDeleted ? '—' : displayValue(left, field, locale),
          server: right ? displayValue(right, field, locale) : '—',
        }))}
        canKeepLocal={Boolean(server || !localDeleted)} onResolve={onResolve} />
      {server && !base && !localDeleted && <Text style={{ color }}>{text.missingBase}</Text>}
      {!server && <Text style={{ color }}>{text.copy}</Text>}
    </View>
  );
}
