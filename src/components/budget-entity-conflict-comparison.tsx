import { conflictDate } from '@/utils/conflict-date';
import { Text, View } from 'react-native';

import { ConflictComparison } from '@/components/conflict-comparison';
import { ConflictIconPreview } from '@/components/conflict-icon-preview';
import { mergeBudgetEntityVersions } from '@/services/budget-entity-conflict';
import type { Language } from '@/i18n/languages';
import type { BudgetEntityConflict } from '@/services/budget-entity-conflict';
import { currencyFractionDigits } from '@/utils/money';

const labels = {
  en: {
    ACCOUNT: 'Account', CATEGORY: 'Category', TRANSFER: 'Transfer', local: 'On this device', server: 'On the server',
    keepLocal: 'Retry my changes', keepServer: 'Use server version', absent: 'Deleted', archived: 'Archived', active: 'Active',
    failed: 'Could not apply this choice. Your queued changes are preserved.',
    linked: 'Other local entries or transfers still use this item. Move them to another account or category first.',
    icon_key: 'Icon', name: 'Name', description: 'Note', archived_at: 'Status', amount_minor: 'Amount sent',
    target_amount_minor: 'Amount received', date_time: 'Date',
    from_account_sync_id: 'From account', to_account_sync_id: 'To account',
  },
  ru: {
    ACCOUNT: 'Счёт', CATEGORY: 'Категория', TRANSFER: 'Перевод', local: 'На телефоне', server: 'На сервере',
    keepLocal: 'Повторить мои изменения', keepServer: 'Применить версию сервера', absent: 'Удалено', archived: 'В архиве', active: 'Активен',
    failed: 'Не удалось применить выбор. Изменения остались в очереди.',
    linked: 'На этот объект ещё ссылаются локальные операции. Сначала выберите для них другой счёт или категорию.',
    icon_key: 'Иконка', name: 'Название', description: 'Примечание', archived_at: 'Статус', amount_minor: 'Списано',
    target_amount_minor: 'Зачислено', date_time: 'Дата',
    from_account_sync_id: 'Исходный счёт', to_account_sync_id: 'Счёт назначения',
  },
  fi: {
    ACCOUNT: 'Tili', CATEGORY: 'Luokka', TRANSFER: 'Tilisiirto', local: 'Laitteella', server: 'Palvelimella',
    keepLocal: 'Yritä muutoksiani uudelleen', keepServer: 'Käytä palvelimen versiota', absent: 'Poistettu', archived: 'Arkistoitu', active: 'Aktiivinen',
    failed: 'Valintaa ei voitu käyttää. Muutokset säilyvät jonossa.',
    linked: 'Tähän kohteeseen liittyy paikallisia tapahtumia. Siirrä ne ensin toiselle tilille tai toiseen luokkaan.',
    icon_key: 'Kuvake', name: 'Nimi', description: 'Huomautus', archived_at: 'Tila', amount_minor: 'Lähetetty',
    target_amount_minor: 'Vastaanotettu', date_time: 'Päivä',
    from_account_sync_id: 'Lähtötili', to_account_sync_id: 'Kohdetili',
  },
};
const fields = {
  ACCOUNT: ['name', 'description', 'icon_key', 'archived_at'],
  CATEGORY: ['name'],
  TRANSFER: ['from_account_sync_id', 'to_account_sync_id', 'amount_minor', 'target_amount_minor', 'date_time', 'description'],
} as const;

export function BudgetEntityConflictComparison({ conflict, language, locale, color, onResolve }: {
  conflict: BudgetEntityConflict;
  language: Language;
  locale: string;
  color: string;
  onResolve: (choice: 'local' | 'server') => Promise<void>;
}) {
  const text = labels[language];
  const previews = {
    local: mergeBudgetEntityVersions(conflict, 'local')?.merged ?? conflict.local,
    server: mergeBudgetEntityVersions(conflict, 'server')?.merged ?? conflict.server,
  };
  function display(field: string, side: 'local' | 'server') {
    const row = previews[side];
    if (!row) return '—';
    const value = row[field];
    if (field === 'icon_key') return <ConflictIconPreview kind="account"
      iconKey={typeof value === 'string' ? value : null} color={color} />;
    if (field === 'archived_at') return value ? text.archived : text.active;
    if ((field === 'from_account_sync_id' || field === 'to_account_sync_id') && typeof value === 'string') {
      return (side === 'local' ? conflict.localAccountNames[value] : conflict.budget.accounts.get(value)?.name) ?? value;
    }
    if (typeof value === 'number' && (field === 'amount_minor' || field === 'target_amount_minor')) {
      const currency = row[field === 'amount_minor' ? 'source_currency_code' : 'target_currency_code'];
      if (typeof currency === 'string') {
        return new Intl.NumberFormat(locale, { style: 'currency', currency })
          .format(value / (10 ** currencyFractionDigits(currency)));
      }
    }
    return value ?? '—';
  }

  const different = fields[conflict.entity].filter((field) =>
    !conflict.local || !conflict.server || previews.local?.[field] !== previews.server?.[field]);
  const transferDetails = conflict.entity === 'TRANSFER'
    ? [...new Set((['local', 'server'] as const).flatMap((side) => {
        const row = conflict[side];
        if (!row) return [];
        const names = side === 'local' ? conflict.localAccountNames
          : Object.fromEntries([...conflict.budget.accounts].map(([id, account]) => [id, account.name]));
        const fromId = String(row.from_account_sync_id ?? '');
        const toId = String(row.to_account_sync_id ?? '');
        const from = names[fromId] ?? fromId;
        const to = names[toId] ?? toId;
        const date = conflictDate(typeof row.date_time === 'string' ? row.date_time : null, locale);
        return [`${from} → ${to}${date ? ` · ${date}` : ''}`];
      }))].join('\n') : '';
  return (
    <View style={{ gap: 12 }}>
      <ConflictComparison language={language} color={color}
        title={`${text[conflict.entity]}${conflict.local?.name || conflict.server?.name
          ? ` · ${conflict.local?.name ?? conflict.server?.name}` : ''}${transferDetails ? `
${transferDetails}` : ''}`}
        localInfo={conflict.local ? undefined : text.absent}
        serverInfo={conflict.server ? undefined : text.absent}
        rows={different.map((field) => ({ label: text[field],
          local: display(field, 'local'), server: display(field, 'server') }))}
        canKeepLocal={conflict.canKeepLocal} onResolve={onResolve} />
      {conflict.linkedLocally && <Text style={{ color }}>{text.linked}</Text>}
    </View>
  );
}
